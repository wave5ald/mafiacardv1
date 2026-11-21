import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { GameRoomEngine } from '../game/engine';
import {
  generateRoomCode,
  isValidRoomCode,
  normalizeRoomCode,
} from '../shared/roomCode';
import {
  ActionResponse,
  CharacterAppearance,
  GameSettings,
  Language,
  RoomViewState,
} from '../shared/types';
import type { NetworkAdapter, RoomStateListener } from './adapter';
import { dispatchEngineCommand } from './engineCommands';

/**
 * Peer-to-peer room transport.
 *
 * Static hosting (Vercel, Netlify, GitHub Pages…) gives us no room server:
 * Socket.IO is unreachable there, and the old BroadcastChannel fallback only
 * ever worked inside one browser. Here the lobby host's tab stays authoritative
 * (it runs the very same GameRoomEngine as server.ts) and every guest connects
 * to it over a WebRTC data channel, using PeerJS's free public broker only for
 * the initial handshake. No account, key or extra server needed.
 *
 * The host is reachable under a peer id derived from the room code
 * (`mf-k7m4p`), so a code typed by a friend routes to the right tab. The host's
 * tab must stay open, exactly like a locally hosted server would.
 */

const HOST_PEER_PREFIX = 'mf-';
const OPEN_TIMEOUT_MS = 20000;
const COMMAND_TIMEOUT_MS = 12000;

interface PeerCommand {
  type: 'cmd';
  reqId?: string;
  action: string;
  payload?: Record<string, unknown>;
}

interface PeerReply {
  type: 'reply';
  reqId: string;
  response: ActionResponse<unknown>;
}

interface PeerState {
  type: 'state';
  view: RoomViewState;
}

type PeerMessage = PeerCommand | PeerReply | PeerState;

function hostPeerId(roomCode: string): string {
  return `${HOST_PEER_PREFIX}${roomCode.toLowerCase()}`;
}

function peerErrorType(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'type' in error) {
    return (error as { type?: string }).type;
  }
  return undefined;
}

function waitForPeerOpen(peer: Peer, timeoutMs: number): Promise<Peer> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      peer.off('open', onOpen);
      peer.off('error', onError);
      callback();
    };
    const onOpen = () => finish(() => resolve(peer));
    const onError = (error: unknown) => finish(() => reject(error));

    peer.on('open', onOpen);
    peer.on('error', onError);
    timer = setTimeout(() => finish(() => reject(new Error('peer-open-timeout'))), timeoutMs);
  });
}

function waitForConnectionOpen(connection: DataConnection, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (connection.open) {
      resolve();
      return;
    }
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      connection.off('open', onOpen);
      connection.off('error', onError);
      callback();
    };
    const onOpen = () => finish(() => resolve());
    const onError = (error: unknown) => finish(() => reject(error));

    connection.on('open', onOpen);
    connection.on('error', onError);
    timer = setTimeout(() => finish(() => reject(new Error('connection-timeout'))), timeoutMs);
  });
}

export class PeerRoomAdapter implements NetworkAdapter {
  public readonly mode = 'peer' as const;

  private listeners = new Set<RoomStateListener>();
  private pendingReplies = new Map<string, (res: ActionResponse<unknown>) => void>();

  private peer: Peer | null = null;
  private engine: GameRoomEngine | null = null;
  private connection: DataConnection | null = null;
  private hostConnections = new Map<string, DataConnection>();

  private isHosting = false;
  private currentRoomCode: string | null = null;
  private myId = `host_${Math.random().toString(36).slice(2, 9)}`;

  public subscribe(listener: RoomStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitState(state: RoomViewState | null): void {
    for (const listener of this.listeners) listener(state);
  }

  private async openPeer(id?: string, timeoutMs = OPEN_TIMEOUT_MS): Promise<Peer> {
    const peer = id ? new Peer(id, { debug: 0 }) : new Peer({ debug: 0 });
    try {
      return await waitForPeerOpen(peer, timeoutMs);
    } catch (error) {
      peer.destroy();
      throw error;
    }
  }

  public async createRoom(
    playerName: string,
    appearance?: CharacterAppearance,
  ): Promise<ActionResponse<{ roomCode: string }>> {
    await this.teardown();

    for (let attempt = 0; attempt < 4; attempt++) {
      const roomCode = generateRoomCode();
      let peer: Peer;
      try {
        peer = await this.openPeer(hostPeerId(roomCode));
      } catch (error) {
        // Someone already holds this id for the same code: try a fresh code.
        if (peerErrorType(error) === 'unavailable-id') continue;
        return { ok: false, error: 'SERVER_UNREACHABLE' };
      }

      this.myId = `host_${Math.random().toString(36).slice(2, 9)}`;
      this.peer = peer;
      this.isHosting = true;
      this.engine = new GameRoomEngine((_code, viewsByPlayerId) => {
        this.publishViews(viewsByPlayerId);
      });

      peer.on('connection', (connection) => this.attachHostConnection(connection));
      peer.on('disconnected', () => {
        // Keep the host id reserved for guests that reconnect.
        try {
          peer.reconnect();
        } catch {
          // Ignore: the peer will report an error if it cannot recover.
        }
      });

      const created = this.engine.createRoom(this.myId, playerName, appearance, roomCode);
      if (!created.ok) {
        await this.teardown();
        return created;
      }
      this.currentRoomCode = roomCode;
      return created;
    }

    return { ok: false, error: 'SERVER_UNREACHABLE' };
  }

  public async joinRoom(
    roomCode: string,
    playerName: string,
    appearance?: CharacterAppearance,
  ): Promise<ActionResponse<{ roomCode: string }>> {
    const code = normalizeRoomCode(roomCode);
    if (!isValidRoomCode(code)) {
      return { ok: false, error: 'INVALID_ROOM_CODE' };
    }

    await this.teardown();

    let peer: Peer;
    try {
      peer = await this.openPeer();
    } catch {
      return { ok: false, error: 'SERVER_UNREACHABLE' };
    }

    let hostUnavailable = false;
    peer.on('error', (error: unknown) => {
      if (peerErrorType(error) === 'peer-unavailable') hostUnavailable = true;
    });

    const connection = peer.connect(hostPeerId(code), { reliable: true });
    try {
      await waitForConnectionOpen(connection, OPEN_TIMEOUT_MS);
    } catch {
      peer.destroy();
      return { ok: false, error: hostUnavailable ? 'ROOM_NOT_FOUND' : 'SERVER_UNREACHABLE' };
    }

    this.peer = peer;
    this.connection = connection;
    this.isHosting = false;
    this.currentRoomCode = code;

    connection.on('data', (raw) => this.handleGuestData(raw as PeerMessage));
    connection.on('close', () => {
      if (this.connection !== connection) return;
      this.connection = null;
      this.emitState(null);
    });

    const joined = await this.request<{ roomCode: string }>('join_room', {
      roomCode: code,
      playerName,
      appearance,
    });
    if (!joined.ok) {
      await this.teardown();
      return joined;
    }
    return joined;
  }

  private attachHostConnection(connection: DataConnection): void {
    connection.on('open', () => {
      this.hostConnections.set(connection.peer, connection);
    });
    connection.on('data', (raw) => this.handleHostData(connection, raw as PeerMessage));

    const drop = () => {
      if (this.hostConnections.get(connection.peer) === connection) {
        this.hostConnections.delete(connection.peer);
      }
      this.engine?.leaveRoom(connection.peer);
    };
    connection.on('close', drop);
    connection.on('error', drop);
  }

  private handleHostData(connection: DataConnection, message: PeerMessage): void {
    if (!message || message.type !== 'cmd' || !this.engine) return;
    const response = dispatchEngineCommand(
      this.engine,
      connection.peer,
      message.action,
      message.payload ?? {},
    );
    if (message.reqId) {
      connection.send({ type: 'reply', reqId: message.reqId, response } satisfies PeerReply);
    }
    if (message.action === 'leave_room') {
      try {
        connection.close();
      } catch {
        // Connection already gone.
      }
    }
  }

  private handleGuestData(message: PeerMessage): void {
    if (!message) return;
    if (message.type === 'state' && message.view) {
      this.emitState(message.view);
      return;
    }
    if (message.type === 'reply' && message.reqId) {
      const resolve = this.pendingReplies.get(message.reqId);
      if (resolve) {
        this.pendingReplies.delete(message.reqId);
        resolve(message.response ?? { ok: false, error: 'INVALID_ACTION' });
      }
    }
  }

  private publishViews(viewsByPlayerId: Map<string, RoomViewState>): void {
    const ownView = viewsByPlayerId.get(this.myId);
    if (ownView) this.emitState(ownView);

    for (const [playerId, view] of viewsByPlayerId.entries()) {
      if (playerId === this.myId) continue;
      const connection = this.hostConnections.get(playerId);
      if (connection && connection.open) {
        connection.send({ type: 'state', view } satisfies PeerState);
      }
    }
  }

  private request<T = undefined>(
    action: string,
    payload: Record<string, unknown> = {},
  ): Promise<ActionResponse<T>> {
    if (this.isHosting && this.engine) {
      return Promise.resolve(
        dispatchEngineCommand(this.engine, this.myId, action, payload) as ActionResponse<T>,
      );
    }

    const connection = this.connection;
    if (!connection || !connection.open) {
      return Promise.resolve({ ok: false, error: 'SERVER_UNREACHABLE' });
    }

    const reqId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.pendingReplies.delete(reqId)) {
          resolve({ ok: false, error: 'SERVER_UNREACHABLE' });
        }
      }, COMMAND_TIMEOUT_MS);

      this.pendingReplies.set(reqId, (response) => {
        clearTimeout(timer);
        resolve(response as ActionResponse<T>);
      });

      connection.send({ type: 'cmd', reqId, action, payload } satisfies PeerCommand);
    });
  }

  public leaveRoom(): void {
    if (this.isHosting && this.engine) {
      this.engine.leaveRoom(this.myId);
    } else if (this.connection?.open) {
      this.connection.send({
        type: 'cmd',
        action: 'leave_room',
        payload: {},
      } satisfies PeerCommand);
    }
    void this.teardown();
    this.emitState(null);
  }

  public addBot(lang: Language): Promise<ActionResponse> {
    return this.request('add_bot', { lang });
  }

  public removeBot(botId?: string): Promise<ActionResponse> {
    return this.request('remove_bot', { botId });
  }

  public updateAppearance(appearance: CharacterAppearance): Promise<ActionResponse> {
    return this.request('update_appearance', { appearance });
  }

  public setReady(isReady: boolean): Promise<ActionResponse> {
    return this.request('set_ready', { isReady });
  }

  public updateSettings(patch: Partial<GameSettings>): Promise<ActionResponse> {
    return this.request('update_settings', { patch });
  }

  public startGame(): Promise<ActionResponse> {
    return this.request('start_game');
  }

  public submitNightTarget(targetId: string): Promise<ActionResponse> {
    return this.request('submit_night_target', { targetId });
  }

  public confirmNightAction(): Promise<ActionResponse> {
    return this.request('confirm_night_action');
  }

  public continuePhase(): Promise<ActionResponse> {
    return this.request('continue_phase');
  }

  public submitDayVote(targetId: string | 'SKIP'): Promise<ActionResponse> {
    return this.request('submit_day_vote', { targetId });
  }

  public activateAbility(targetId?: string, secondTargetId?: string): Promise<ActionResponse> {
    return this.request('activate_ability', { targetId, secondTargetId });
  }

  public playAgain(): Promise<ActionResponse> {
    return this.request('play_again');
  }

  public returnToLobby(): Promise<ActionResponse> {
    return this.request('return_to_lobby');
  }

  private async teardown(): Promise<void> {
    this.pendingReplies.clear();
    this.hostConnections.clear();

    const connection = this.connection;
    this.connection = null;
    if (connection) {
      try {
        connection.close();
      } catch {
        // Already closed.
      }
    }

    const peer = this.peer;
    this.peer = null;
    this.isHosting = false;
    this.currentRoomCode = null;

    if (peer) {
      try {
        peer.destroy();
      } catch {
        // Already destroyed.
      }
    }

    this.engine?.dispose();
    this.engine = null;
  }

  public dispose(): void {
    void this.teardown();
    this.listeners.clear();
  }
}

import { io, Socket } from 'socket.io-client';
import {
  ActionResponse,
  CharacterAppearance,
  GameSettings,
  Language,
  RoomViewState,
} from '../shared/types';
import { PeerRoomAdapter } from './peerAdapter';
import { RelayRoomAdapter } from './relayAdapter';

export type RoomStateListener = (state: RoomViewState | null) => void;

export type TransportMode = 'socket' | 'relay' | 'peer';

export interface NetworkAdapter {
  readonly mode: TransportMode;
  subscribe(listener: RoomStateListener): () => void;
  createRoom(
    playerName: string,
    appearance?: CharacterAppearance,
  ): Promise<ActionResponse<{ roomCode: string }>>;
  joinRoom(
    roomCode: string,
    playerName: string,
    appearance?: CharacterAppearance,
  ): Promise<ActionResponse<{ roomCode: string }>>;
  leaveRoom(): void;
  addBot(lang: Language): Promise<ActionResponse>;
  removeBot(botId?: string): Promise<ActionResponse>;
  updateAppearance(appearance: CharacterAppearance): Promise<ActionResponse>;
  setReady(isReady: boolean): Promise<ActionResponse>;
  updateSettings(patch: Partial<GameSettings>): Promise<ActionResponse>;
  startGame(): Promise<ActionResponse>;
  submitNightTarget(targetId: string): Promise<ActionResponse>;
  confirmNightAction(): Promise<ActionResponse>;
  continuePhase(): Promise<ActionResponse>;
  submitDayVote(targetId: string | 'SKIP'): Promise<ActionResponse>;
  activateAbility(targetId?: string, secondTargetId?: string): Promise<ActionResponse>;
  playAgain(): Promise<ActionResponse>;
  returnToLobby(): Promise<ActionResponse>;
  dispose(): void;
}

function resolveServerUrl(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const configured = env?.VITE_SERVER_URL?.trim();
  if (configured) return configured;
  return typeof window === 'undefined' ? '' : window.location.origin;
}

/**
 * Picks the best room transport available at runtime:
 *
 * 1. `socket` — a real Socket.IO room server (local `npm run dev`, or a Node
 *    host configured through VITE_SERVER_URL).
 * 2. `relay` — messages relayed through public MQTT-over-WebSocket brokers, so
 *    rooms work on static hosting (Vercel) regardless of NAT.
 * 3. `peer` — direct WebRTC as a last resort when every relay broker is
 *    unreachable.
 */
export class HybridNetworkAdapter implements NetworkAdapter {
  private socket: Socket | null = null;
  private socketConnected = false;
  private relay = new RelayRoomAdapter();
  private peer = new PeerRoomAdapter();
  private listeners = new Set<RoomStateListener>();
  private activeLayer: TransportMode = 'relay';

  constructor() {
    this.relay.subscribe((view) => {
      if (this.activeLayer === 'relay') this.emitState(view);
    });

    this.peer.subscribe((view) => {
      if (this.activeLayer === 'peer') this.emitState(view);
    });

    if (typeof window === 'undefined') return;

    const serverUrl = resolveServerUrl();
    if (!serverUrl) return;

    try {
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 2,
        reconnectionDelayMax: 4000,
        timeout: 2500,
      });

      this.socket.on('connect', () => {
        this.socketConnected = true;
      });

      this.socket.on('disconnect', () => {
        this.socketConnected = false;
      });

      this.socket.on('room_state', (view: RoomViewState) => {
        if (this.activeLayer === 'socket') this.emitState(view);
      });
    } catch {
      this.socket = null;
    }
  }

  public get mode(): TransportMode {
    return this.activeLayer;
  }

  public subscribe(listener: RoomStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitState(state: RoomViewState | null): void {
    for (const listener of this.listeners) listener(state);
  }

  private emitSocket<T = undefined>(
    event: string,
    payload: Record<string, unknown>,
  ): Promise<ActionResponse<T>> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socketConnected) {
        resolve({ ok: false, error: 'SERVER_UNREACHABLE' });
        return;
      }
      const timeout = setTimeout(
        () => resolve({ ok: false, error: 'SERVER_UNREACHABLE' }),
        5000,
      );
      this.socket.emit(event, payload, (res: ActionResponse<T>) => {
        clearTimeout(timeout);
        resolve(res ?? { ok: false, error: 'INVALID_ACTION' });
      });
    });
  }

  public async createRoom(
    playerName: string,
    appearance?: CharacterAppearance,
  ): Promise<ActionResponse<{ roomCode: string }>> {
    if (this.socket && this.socketConnected) {
      const res = await this.emitSocket<{ roomCode: string }>('create_room', {
        playerName,
        appearance,
      });
      if (res.ok) {
        this.activeLayer = 'socket';
        return res;
      }
      if (res.error && res.error !== 'SERVER_UNREACHABLE') return res;
    }

    this.activeLayer = 'relay';
    const relayed = await this.relay.createRoom(playerName, appearance);
    if (relayed.ok) return relayed;
    if (relayed.error && relayed.error !== 'SERVER_UNREACHABLE') return relayed;

    this.activeLayer = 'peer';
    return this.peer.createRoom(playerName, appearance);
  }

  public async joinRoom(
    roomCode: string,
    playerName: string,
    appearance?: CharacterAppearance,
  ): Promise<ActionResponse<{ roomCode: string }>> {
    if (this.socket && this.socketConnected) {
      const res = await this.emitSocket<{ roomCode: string }>('join_room', {
        roomCode,
        playerName,
        appearance,
      });
      if (res.ok) {
        this.activeLayer = 'socket';
        return res;
      }
      // The server answered and rejected the code (or the server no longer has
      // that room). Do not silently retry elsewhere, that would mask a real
      // answer with a confusing one.
      if (res.error && res.error !== 'SERVER_UNREACHABLE') return res;
    }

    // A room could be hosted over either fallback, so try both before failing.
    this.activeLayer = 'relay';
    const relayed = await this.relay.joinRoom(roomCode, playerName, appearance);
    if (relayed.ok) return relayed;

    this.activeLayer = 'peer';
    const peered = await this.peer.joinRoom(roomCode, playerName, appearance);
    if (peered.ok) return peered;

    return relayed.error === 'ROOM_NOT_FOUND' ? relayed : peered.error ? peered : relayed;
  }

  public leaveRoom(): void {
    if (this.activeLayer === 'socket' && this.socket) {
      this.socket.emit('leave_room');
      this.emitState(null);
    }
    this.relay.leaveRoom();
    this.peer.leaveRoom();
  }

  public addBot(lang: Language): Promise<ActionResponse> {
    if (this.activeLayer === 'socket') return this.emitSocket('add_bot', { lang });
    return this.activeLayer === 'peer' ? this.peer.addBot(lang) : this.relay.addBot(lang);
  }

  public removeBot(botId?: string): Promise<ActionResponse> {
    if (this.activeLayer === 'socket') return this.emitSocket('remove_bot', { botId });
    return this.activeLayer === 'peer' ? this.peer.removeBot(botId) : this.relay.removeBot(botId);
  }

  public updateAppearance(appearance: CharacterAppearance): Promise<ActionResponse> {
    if (this.activeLayer === 'socket') return this.emitSocket('update_appearance', { appearance });
    return this.activeLayer === 'peer'
      ? this.peer.updateAppearance(appearance)
      : this.relay.updateAppearance(appearance);
  }

  public setReady(isReady: boolean): Promise<ActionResponse> {
    if (this.activeLayer === 'socket') return this.emitSocket('set_ready', { isReady });
    return this.activeLayer === 'peer' ? this.peer.setReady(isReady) : this.relay.setReady(isReady);
  }

  public updateSettings(patch: Partial<GameSettings>): Promise<ActionResponse> {
    if (this.activeLayer === 'socket') return this.emitSocket('update_settings', { patch });
    return this.activeLayer === 'peer'
      ? this.peer.updateSettings(patch)
      : this.relay.updateSettings(patch);
  }

  public startGame(): Promise<ActionResponse> {
    if (this.activeLayer === 'socket') return this.emitSocket('start_game', {});
    return this.activeLayer === 'peer' ? this.peer.startGame() : this.relay.startGame();
  }

  public submitNightTarget(targetId: string): Promise<ActionResponse> {
    if (this.activeLayer === 'socket') return this.emitSocket('submit_night_target', { targetId });
    return this.activeLayer === 'peer'
      ? this.peer.submitNightTarget(targetId)
      : this.relay.submitNightTarget(targetId);
  }

  public confirmNightAction(): Promise<ActionResponse> {
    if (this.activeLayer === 'socket') return this.emitSocket('confirm_night_action', {});
    return this.activeLayer === 'peer'
      ? this.peer.confirmNightAction()
      : this.relay.confirmNightAction();
  }

  public continuePhase(): Promise<ActionResponse> {
    if (this.activeLayer === 'socket') return this.emitSocket('continue_phase', {});
    return this.activeLayer === 'peer' ? this.peer.continuePhase() : this.relay.continuePhase();
  }

  public submitDayVote(targetId: string | 'SKIP'): Promise<ActionResponse> {
    if (this.activeLayer === 'socket') return this.emitSocket('submit_day_vote', { targetId });
    return this.activeLayer === 'peer'
      ? this.peer.submitDayVote(targetId)
      : this.relay.submitDayVote(targetId);
  }

  public activateAbility(targetId?: string, secondTargetId?: string): Promise<ActionResponse> {
    if (this.activeLayer === 'socket') {
      return this.emitSocket('activate_ability', { targetId, secondTargetId });
    }
    return this.activeLayer === 'peer'
      ? this.peer.activateAbility(targetId, secondTargetId)
      : this.relay.activateAbility(targetId, secondTargetId);
  }

  public playAgain(): Promise<ActionResponse> {
    if (this.activeLayer === 'socket') return this.emitSocket('play_again', {});
    return this.activeLayer === 'peer' ? this.peer.playAgain() : this.relay.playAgain();
  }

  public returnToLobby(): Promise<ActionResponse> {
    if (this.activeLayer === 'socket') return this.emitSocket('return_to_lobby', {});
    return this.activeLayer === 'peer' ? this.peer.returnToLobby() : this.relay.returnToLobby();
  }

  public dispose(): void {
    this.socket?.disconnect();
    this.relay.dispose();
    this.peer.dispose();
    this.listeners.clear();
  }
}

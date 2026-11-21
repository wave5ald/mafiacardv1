import { io, Socket } from 'socket.io-client';
import {
  ActionResponse,
  CharacterAppearance,
  GameSettings,
  Language,
  RoomViewState,
} from '../shared/types';
import { PeerRoomAdapter } from './peerAdapter';

export type RoomStateListener = (state: RoomViewState | null) => void;

export interface NetworkAdapter {
  readonly mode: 'socket' | 'peer';
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
 * Uses the Socket.IO room server when one is reachable (local `npm run dev`, or
 * a dedicated Node host configured through VITE_SERVER_URL) and otherwise falls
 * back to the peer-to-peer transport, which is what makes rooms work on static
 * hosting such as Vercel where no room server exists at all.
 */
export class HybridNetworkAdapter implements NetworkAdapter {
  private socket: Socket | null = null;
  private socketConnected = false;
  private peer = new PeerRoomAdapter();
  private listeners = new Set<RoomStateListener>();
  private activeLayer: 'socket' | 'peer' = 'peer';

  constructor() {
    this.peer.subscribe((view) => {
      if (this.activeLayer === 'peer') this.emitState(view);
    });

    if (typeof window === 'undefined') return;

    const serverUrl = resolveServerUrl();
    if (!serverUrl) return;

    try {
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 3,
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

  public get mode(): 'socket' | 'peer' {
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
    }
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
      // that room). Do not silently retry over peer-to-peer, that would mask a
      // real answer with a confusing one.
      if (res.error && res.error !== 'SERVER_UNREACHABLE') return res;
    }
    this.activeLayer = 'peer';
    return this.peer.joinRoom(roomCode, playerName, appearance);
  }

  public leaveRoom(): void {
    if (this.activeLayer === 'socket' && this.socket) {
      this.socket.emit('leave_room');
      this.emitState(null);
    }
    this.peer.leaveRoom();
  }

  public addBot(lang: Language): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('add_bot', { lang })
      : this.peer.addBot(lang);
  }

  public removeBot(botId?: string): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('remove_bot', { botId })
      : this.peer.removeBot(botId);
  }

  public updateAppearance(appearance: CharacterAppearance): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('update_appearance', { appearance })
      : this.peer.updateAppearance(appearance);
  }

  public setReady(isReady: boolean): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('set_ready', { isReady })
      : this.peer.setReady(isReady);
  }

  public updateSettings(patch: Partial<GameSettings>): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('update_settings', { patch })
      : this.peer.updateSettings(patch);
  }

  public startGame(): Promise<ActionResponse> {
    return this.activeLayer === 'socket' ? this.emitSocket('start_game', {}) : this.peer.startGame();
  }

  public submitNightTarget(targetId: string): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('submit_night_target', { targetId })
      : this.peer.submitNightTarget(targetId);
  }

  public confirmNightAction(): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('confirm_night_action', {})
      : this.peer.confirmNightAction();
  }

  public continuePhase(): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('continue_phase', {})
      : this.peer.continuePhase();
  }

  public submitDayVote(targetId: string | 'SKIP'): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('submit_day_vote', { targetId })
      : this.peer.submitDayVote(targetId);
  }

  public activateAbility(targetId?: string, secondTargetId?: string): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('activate_ability', { targetId, secondTargetId })
      : this.peer.activateAbility(targetId, secondTargetId);
  }

  public playAgain(): Promise<ActionResponse> {
    return this.activeLayer === 'socket' ? this.emitSocket('play_again', {}) : this.peer.playAgain();
  }

  public returnToLobby(): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('return_to_lobby', {})
      : this.peer.returnToLobby();
  }

  public dispose(): void {
    this.socket?.disconnect();
    this.peer.dispose();
    this.listeners.clear();
  }
}

import { io, Socket } from 'socket.io-client';
import { GameRoomEngine } from '../game/engine';
import {
  ActionResponse,
  CharacterAppearance,
  GameSettings,
  Language,
  RoomViewState,
} from '../shared/types';

export type RoomStateListener = (state: RoomViewState | null) => void;

export interface NetworkAdapter {
  readonly mode: 'socket' | 'local';
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

/**
 * Multi-Tab Local Adapter using BroadcastChannel so opening 2+ browser tabs lets
 * players join the same room code live even without a live Socket.IO server.
 */
interface BcMessage {
  type: 'cmd' | 'reply' | 'state';
  reqId?: string;
  senderId: string;
  targetId?: string;
  roomCode?: string;
  action?: string;
  payload?: Record<string, unknown>;
  response?: ActionResponse<unknown>;
  view?: RoomViewState;
}

export class LocalBroadcastAdapter implements NetworkAdapter {
  public readonly mode = 'local' as const;
  private readonly tabId = `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  private listeners = new Set<RoomStateListener>();
  private channel: BroadcastChannel | null = null;
  private hostEngine: GameRoomEngine | null = null;
  private isHostingRoom = false;
  private currentRoomCode: string | null = null;
  private pendingReplies = new Map<string, (res: ActionResponse<unknown>) => void>();

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('mafiacards_local_v1');
      this.channel.onmessage = (ev: MessageEvent<BcMessage>) => this.handleBcMessage(ev.data);
    }
  }

  public subscribe(listener: RoomStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitState(state: RoomViewState | null): void {
    for (const l of this.listeners) l(state);
  }

  private ensureHostEngine(): GameRoomEngine {
    if (!this.hostEngine) {
      this.hostEngine = new GameRoomEngine((roomCode, viewsByPlayerId) => {
        const myView = viewsByPlayerId.get(this.tabId);
        if (myView) {
          this.emitState(myView);
        }
        if (this.channel) {
          for (const [playerId, view] of viewsByPlayerId.entries()) {
            if (playerId !== this.tabId) {
              const msg: BcMessage = {
                type: 'state',
                senderId: this.tabId,
                targetId: playerId,
                roomCode,
                view,
              };
              this.channel.postMessage(msg);
            }
          }
        }
      });
    }
    return this.hostEngine;
  }

  private handleBcMessage(msg: BcMessage): void {
    if (!msg || msg.senderId === this.tabId) return;

    if (msg.type === 'state' && msg.targetId === this.tabId && msg.view) {
      this.emitState(msg.view);
      return;
    }

    if (msg.type === 'reply' && msg.targetId === this.tabId && msg.reqId) {
      const resolve = this.pendingReplies.get(msg.reqId);
      if (resolve) {
        this.pendingReplies.delete(msg.reqId);
        resolve(msg.response ?? { ok: false, error: 'INVALID_ACTION' });
      }
      return;
    }

    if (msg.type === 'cmd' && this.isHostingRoom && this.hostEngine) {
      const code = (msg.roomCode || '').toUpperCase();
      if (code && code !== this.currentRoomCode) return;

      const p = msg.payload ?? {};
      let res: ActionResponse<unknown> = { ok: false, error: 'INVALID_ACTION' };
      switch (msg.action) {
        case 'join_room':
          res = this.hostEngine.joinRoom(
            msg.senderId,
            String(p.roomCode ?? ''),
            String(p.playerName ?? ''),
            p.appearance as CharacterAppearance | undefined,
          );
          break;
        case 'leave_room':
          this.hostEngine.leaveRoom(msg.senderId);
          res = { ok: true };
          break;
        case 'update_appearance':
          res = this.hostEngine.updateAppearance(
            msg.senderId,
            p.appearance as CharacterAppearance,
          );
          break;
        case 'set_ready':
          res = this.hostEngine.setReady(msg.senderId, Boolean(p.isReady));
          break;
        case 'submit_night_target':
          res = this.hostEngine.submitNightTarget(msg.senderId, String(p.targetId ?? ''));
          break;
        case 'confirm_night_action':
          res = this.hostEngine.confirmNightAction(msg.senderId);
          break;
        case 'continue_phase':
          res = this.hostEngine.continuePhase(msg.senderId);
          break;
        case 'submit_day_vote':
          res = this.hostEngine.submitDayVote(msg.senderId, String(p.targetId ?? '') as string);
          break;
        case 'activate_ability':
          res = this.hostEngine.activateAbility(
            msg.senderId,
            p.targetId as string | undefined,
            p.secondTargetId as string | undefined,
          );
          break;
      }

      if (this.channel && msg.reqId) {
        this.channel.postMessage({
          type: 'reply',
          reqId: msg.reqId,
          senderId: this.tabId,
          targetId: msg.senderId,
          response: res,
        } satisfies BcMessage);
      }
    }
  }

  private sendRemoteCmd<T = undefined>(
    action: string,
    payload: Record<string, unknown>,
    roomCode?: string,
  ): Promise<ActionResponse<T>> {
    if (!this.channel) {
      return Promise.resolve({ ok: false, error: 'ROOM_NOT_FOUND' });
    }
    const reqId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (this.pendingReplies.has(reqId)) {
          this.pendingReplies.delete(reqId);
          resolve({ ok: false, error: 'ROOM_NOT_FOUND' });
        }
      }, 900);

      this.pendingReplies.set(reqId, (res) => {
        clearTimeout(timeout);
        resolve(res as ActionResponse<T>);
      });

      this.channel!.postMessage({
        type: 'cmd',
        reqId,
        senderId: this.tabId,
        roomCode: roomCode ?? this.currentRoomCode ?? undefined,
        action,
        payload,
      } satisfies BcMessage);
    });
  }

  public async createRoom(
    playerName: string,
    appearance?: CharacterAppearance,
  ): Promise<ActionResponse<{ roomCode: string }>> {
    const engine = this.ensureHostEngine();
    const res = engine.createRoom(this.tabId, playerName, appearance);
    if (res.ok && res.data) {
      this.isHostingRoom = true;
      this.currentRoomCode = res.data.roomCode;
    }
    return res;
  }

  public async joinRoom(
    roomCode: string,
    playerName: string,
    appearance?: CharacterAppearance,
  ): Promise<ActionResponse<{ roomCode: string }>> {
    const code = roomCode.trim().toUpperCase();
    const res = await this.sendRemoteCmd<{ roomCode: string }>(
      'join_room',
      { roomCode: code, playerName, appearance },
      code,
    );
    if (res.ok) {
      this.isHostingRoom = false;
      this.currentRoomCode = code;
    }
    return res;
  }

  public leaveRoom(): void {
    if (this.isHostingRoom && this.hostEngine) {
      this.hostEngine.leaveRoom(this.tabId);
      this.isHostingRoom = false;
    } else if (this.currentRoomCode) {
      void this.sendRemoteCmd('leave_room', {});
    }
    this.currentRoomCode = null;
    this.emitState(null);
  }

  public async addBot(lang: Language): Promise<ActionResponse> {
    if (!this.isHostingRoom || !this.hostEngine) return { ok: false, error: 'NOT_HOST' };
    return this.hostEngine.addBot(this.tabId, lang);
  }

  public async removeBot(botId?: string): Promise<ActionResponse> {
    if (!this.isHostingRoom || !this.hostEngine) return { ok: false, error: 'NOT_HOST' };
    return this.hostEngine.removeBot(this.tabId, botId);
  }

  public async updateAppearance(appearance: CharacterAppearance): Promise<ActionResponse> {
    if (this.isHostingRoom && this.hostEngine) {
      return this.hostEngine.updateAppearance(this.tabId, appearance);
    }
    return this.sendRemoteCmd('update_appearance', { appearance });
  }

  public async setReady(isReady: boolean): Promise<ActionResponse> {
    if (this.isHostingRoom && this.hostEngine) {
      return this.hostEngine.setReady(this.tabId, isReady);
    }
    return this.sendRemoteCmd('set_ready', { isReady });
  }

  public async updateSettings(patch: Partial<GameSettings>): Promise<ActionResponse> {
    if (!this.isHostingRoom || !this.hostEngine) return { ok: false, error: 'NOT_HOST' };
    return this.hostEngine.updateSettings(this.tabId, patch);
  }

  public async startGame(): Promise<ActionResponse> {
    if (!this.isHostingRoom || !this.hostEngine) return { ok: false, error: 'NOT_HOST' };
    return this.hostEngine.startGame(this.tabId);
  }

  public async submitNightTarget(targetId: string): Promise<ActionResponse> {
    if (this.isHostingRoom && this.hostEngine) {
      return this.hostEngine.submitNightTarget(this.tabId, targetId);
    }
    return this.sendRemoteCmd('submit_night_target', { targetId });
  }

  public async confirmNightAction(): Promise<ActionResponse> {
    if (this.isHostingRoom && this.hostEngine) {
      return this.hostEngine.confirmNightAction(this.tabId);
    }
    return this.sendRemoteCmd('confirm_night_action', {});
  }

  public async continuePhase(): Promise<ActionResponse> {
    if (this.isHostingRoom && this.hostEngine) {
      return this.hostEngine.continuePhase(this.tabId);
    }
    return this.sendRemoteCmd('continue_phase', {});
  }

  public async submitDayVote(targetId: string | 'SKIP'): Promise<ActionResponse> {
    if (this.isHostingRoom && this.hostEngine) {
      return this.hostEngine.submitDayVote(this.tabId, targetId);
    }
    return this.sendRemoteCmd('submit_day_vote', { targetId });
  }

  public async activateAbility(
    targetId?: string,
    secondTargetId?: string,
  ): Promise<ActionResponse> {
    if (this.isHostingRoom && this.hostEngine) {
      return this.hostEngine.activateAbility(this.tabId, targetId, secondTargetId);
    }
    return this.sendRemoteCmd('activate_ability', { targetId, secondTargetId });
  }

  public async playAgain(): Promise<ActionResponse> {
    if (!this.isHostingRoom || !this.hostEngine) return { ok: false, error: 'NOT_HOST' };
    return this.hostEngine.playAgain(this.tabId);
  }

  public async returnToLobby(): Promise<ActionResponse> {
    if (!this.isHostingRoom || !this.hostEngine) return { ok: false, error: 'INVALID_ACTION' };
    return this.hostEngine.returnToLobby(this.tabId);
  }

  public dispose(): void {
    this.hostEngine?.dispose();
    this.channel?.close();
    this.listeners.clear();
  }
}

/**
 * Authoritative Socket.IO client adapter with seamless automatic fallback to LocalBroadcastAdapter
 * if Socket.IO cannot reach a backend (e.g. static hosting preview).
 */
export class HybridNetworkAdapter implements NetworkAdapter {
  private socket: Socket | null = null;
  private socketConnected = false;
  private local = new LocalBroadcastAdapter();
  private listeners = new Set<RoomStateListener>();
  private activeLayer: 'socket' | 'local' = 'local';

  constructor() {
    this.local.subscribe((view) => {
      if (this.activeLayer === 'local') {
        this.emitState(view);
      }
    });

    if (typeof window !== 'undefined') {
      try {
        this.socket = io(window.location.origin, {
          transports: ['polling', 'websocket'],
          reconnectionAttempts: 2,
          timeout: 2500,
        });

        this.socket.on('connect', () => {
          this.socketConnected = true;
        });

        this.socket.on('disconnect', () => {
          this.socketConnected = false;
        });

        this.socket.on('room_state', (view: RoomViewState) => {
          if (this.activeLayer === 'socket') {
            this.emitState(view);
          }
        });
      } catch {
        this.socket = null;
      }
    }
  }

  public get mode(): 'socket' | 'local' {
    return this.activeLayer;
  }

  public subscribe(listener: RoomStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitState(state: RoomViewState | null): void {
    for (const l of this.listeners) l(state);
  }

  private emitSocket<T = undefined>(
    event: string,
    payload: Record<string, unknown>,
  ): Promise<ActionResponse<T>> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socketConnected) {
        resolve({ ok: false, error: 'INVALID_ACTION' });
        return;
      }
      const timeout = setTimeout(() => resolve({ ok: false, error: 'INVALID_ACTION' }), 3500);
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
      this.activeLayer = 'socket';
      return this.emitSocket('create_room', { playerName, appearance });
    }
    this.activeLayer = 'local';
    return this.local.createRoom(playerName, appearance);
  }

  public async joinRoom(
    roomCode: string,
    playerName: string,
    appearance?: CharacterAppearance,
  ): Promise<ActionResponse<{ roomCode: string }>> {
    if (this.socket && this.socketConnected) {
      this.activeLayer = 'socket';
      return this.emitSocket('join_room', { roomCode, playerName, appearance });
    }
    this.activeLayer = 'local';
    return this.local.joinRoom(roomCode, playerName, appearance);
  }

  public leaveRoom(): void {
    if (this.activeLayer === 'socket' && this.socket) {
      this.socket.emit('leave_room');
      this.emitState(null);
    } else {
      this.local.leaveRoom();
    }
  }

  public addBot(lang: Language): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('add_bot', { lang })
      : this.local.addBot(lang);
  }

  public removeBot(botId?: string): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('remove_bot', { botId })
      : this.local.removeBot(botId);
  }

  public updateAppearance(appearance: CharacterAppearance): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('update_appearance', { appearance })
      : this.local.updateAppearance(appearance);
  }

  public setReady(isReady: boolean): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('set_ready', { isReady })
      : this.local.setReady(isReady);
  }

  public updateSettings(patch: Partial<GameSettings>): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('update_settings', { patch })
      : this.local.updateSettings(patch);
  }

  public startGame(): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('start_game', {})
      : this.local.startGame();
  }

  public submitNightTarget(targetId: string): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('submit_night_target', { targetId })
      : this.local.submitNightTarget(targetId);
  }

  public confirmNightAction(): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('confirm_night_action', {})
      : this.local.confirmNightAction();
  }

  public continuePhase(): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('continue_phase', {})
      : this.local.continuePhase();
  }

  public submitDayVote(targetId: string | 'SKIP'): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('submit_day_vote', { targetId })
      : this.local.submitDayVote(targetId);
  }

  public activateAbility(targetId?: string, secondTargetId?: string): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('activate_ability', { targetId, secondTargetId })
      : this.local.activateAbility(targetId, secondTargetId);
  }

  public playAgain(): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('play_again', {})
      : this.local.playAgain();
  }

  public returnToLobby(): Promise<ActionResponse> {
    return this.activeLayer === 'socket'
      ? this.emitSocket('return_to_lobby', {})
      : this.local.returnToLobby();
  }

  public dispose(): void {
    this.socket?.disconnect();
    this.local.dispose();
    this.listeners.clear();
  }
}

import mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';
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
 * Relayed room transport.
 *
 * Static hosting (Vercel, Netlify, GitHub Pages…) gives us no game server, and
 * WebRTC alone fails for a lot of players behind carrier-grade NAT. Here the
 * host tab still keeps the authoritative GameRoomEngine, but messages are
 * relayed through public MQTT-over-WebSocket brokers: no NAT traversal, no
 * accounts, no keys, and it works from any network that allows HTTPS/WSS.
 *
 * The host listens on every reachable broker at once and each guest picks
 * whichever broker answers first, so one flaky public broker cannot break a
 * room. Topics are scoped per room code: `mafiacards/v3/<CODE>/h` (guest ->
 * host) and `mafiacards/v3/<CODE>/p/<playerId>` (host -> one guest).
 */

const BROKERS = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
];

const TOPIC_ROOT = 'mafiacards/v3';
const CONNECT_TIMEOUT_MS = 7000;
const SUBSCRIBE_TIMEOUT_MS = 5000;
const JOIN_TIMEOUT_MS = 7000;
const COMMAND_TIMEOUT_MS = 10000;

interface RelayCommand {
  t: 'cmd';
  id?: string;
  from: string;
  action: string;
  payload?: Record<string, unknown>;
}

interface RelayReply {
  t: 'rep';
  id: string;
  res: ActionResponse<unknown>;
}

interface RelayState {
  t: 'state';
  view: RoomViewState;
}

type RelayMessage = RelayCommand | RelayReply | RelayState;

interface Pending {
  client: MqttClient;
  resolve: (res: ActionResponse<unknown>) => void;
}

function randomId(length = 8): string {
  let out = '';
  while (out.length < length) {
    out += Math.random().toString(36).slice(2);
  }
  return out.slice(0, length);
}

function topicBase(roomCode: string): string {
  return `${TOPIC_ROOT}/${roomCode}`;
}

function parseMessage(payload: { toString: () => string }): RelayMessage | null {
  try {
    const parsed = JSON.parse(payload.toString()) as RelayMessage;
    return parsed && typeof parsed === 'object' && 't' in parsed ? parsed : null;
  } catch {
    return null;
  }
}

function connectBroker(url: string, clientId: string): Promise<MqttClient> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const client = mqtt.connect(url, {
      clientId,
      clean: true,
      protocolVersion: 4,
      keepalive: 25,
      connectTimeout: CONNECT_TIMEOUT_MS,
      reconnectPeriod: 3000,
      resubscribe: true,
    });

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.removeListener('connect', onConnect);
      client.removeListener('error', onError);
      if (error) {
        try {
          client.end(true);
        } catch {
          // Already closed.
        }
        reject(error);
      } else {
        resolve(client);
      }
    };
    const onConnect = () => finish();
    const onError = (error: Error) => finish(error);
    const timer = setTimeout(() => finish(new Error('broker-connect-timeout')), CONNECT_TIMEOUT_MS);

    client.on('connect', onConnect);
    client.on('error', onError);
  });
}

function subscribe(client: MqttClient, topic: string): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, SUBSCRIBE_TIMEOUT_MS);
    try {
      client.subscribe(topic, { qos: 0 }, done);
    } catch {
      done();
    }
  });
}

export class RelayRoomAdapter implements NetworkAdapter {
  public readonly mode = 'relay' as const;

  private listeners = new Set<RoomStateListener>();
  private clients: MqttClient[] = [];
  private pending = new Map<string, Pending>();

  private engine: GameRoomEngine | null = null;
  private isHosting = false;
  private currentRoomCode: string | null = null;
  private cmdClient: MqttClient | null = null;
  private myId = `p${randomId()}`;

  public subscribe(listener: RoomStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitState(state: RoomViewState | null): void {
    for (const listener of this.listeners) listener(state);
  }

  private async connectAll(): Promise<MqttClient[]> {
    const attempts = await Promise.all(
      BROKERS.map((url) =>
        connectBroker(url, `mf_${randomId(12)}`).catch(() => null),
      ),
    );
    const clients = attempts.filter((client): client is MqttClient => client !== null);
    for (const client of clients) {
      // A later broker error must never surface as an unhandled event.
      client.on('error', () => undefined);
    }
    this.clients = clients;
    return clients;
  }

  private publish(client: MqttClient, topic: string, message: RelayMessage): void {
    try {
      client.publish(topic, JSON.stringify(message), { qos: 0 });
    } catch {
      // Broker already gone; other brokers may still deliver.
    }
  }

  private publishToAll(topic: string, message: RelayMessage): void {
    for (const client of this.clients) {
      if (client.connected) this.publish(client, topic, message);
    }
  }

  public async createRoom(
    playerName: string,
    appearance?: CharacterAppearance,
  ): Promise<ActionResponse<{ roomCode: string }>> {
    await this.teardown();

    const clients = await this.connectAll();
    if (!clients.length) return { ok: false, error: 'SERVER_UNREACHABLE' };

    this.myId = `h_${randomId()}`;

    for (let attempt = 0; attempt < 3; attempt++) {
      const roomCode = generateRoomCode();
      const base = topicBase(roomCode);
      await Promise.all(clients.map((client) => subscribe(client, `${base}/h`)));

      this.currentRoomCode = roomCode;
      this.engine = new GameRoomEngine((_code, views) => this.publishViews(views));
      for (const client of clients) {
        client.on('message', (topic, payload) => this.handleHostMessage(client, topic, payload));
      }

      const created = this.engine.createRoom(this.myId, playerName, appearance, roomCode);
      if (created.ok) {
        this.isHosting = true;
        return created;
      }

      this.engine.dispose();
      this.engine = null;
      if (created.error !== 'INVALID_ACTION') {
        await this.teardown();
        return created;
      }
    }

    await this.teardown();
    return { ok: false, error: 'SERVER_UNREACHABLE' };
  }

  public async joinRoom(
    roomCode: string,
    playerName: string,
    appearance?: CharacterAppearance,
  ): Promise<ActionResponse<{ roomCode: string }>> {
    const code = normalizeRoomCode(roomCode);
    if (!isValidRoomCode(code)) return { ok: false, error: 'INVALID_ROOM_CODE' };

    await this.teardown();

    const clients = await this.connectAll();
    if (!clients.length) return { ok: false, error: 'SERVER_UNREACHABLE' };

    this.myId = `p_${randomId()}`;
    const base = topicBase(code);
    const ownTopic = `${base}/p/${this.myId}`;
    await Promise.all(clients.map((client) => subscribe(client, ownTopic)));
    for (const client of clients) {
      client.on('message', (_topic, payload) => this.handleGuestMessage(payload));
    }

    const joined = await this.requestJoin(clients, base, code, playerName, appearance);
    if (!joined.ok) {
      await this.teardown();
      return joined;
    }

    this.currentRoomCode = code;
    this.isHosting = false;
    return joined;
  }

  /**
   * Publishes the join command on every connected broker and takes the first
   * answer. Joining the same room twice with the same player id is harmless
   * (the engine treats it as a reconnect), so the fan-out is safe.
   */
  private requestJoin(
    clients: MqttClient[],
    base: string,
    roomCode: string,
    playerName: string,
    appearance?: CharacterAppearance,
  ): Promise<ActionResponse<{ roomCode: string }>> {
    return new Promise((resolve) => {
      let settled = false;
      const settle = (client: MqttClient | null, res: ActionResponse<unknown>) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        for (const id of ids) this.pending.delete(id);
        if (client) this.cmdClient = client;
        resolve(res as ActionResponse<{ roomCode: string }>);
      };
      const timer = setTimeout(() => settle(null, { ok: false, error: 'ROOM_NOT_FOUND' }), JOIN_TIMEOUT_MS);
      const ids: string[] = [];

      for (const client of clients) {
        if (!client.connected) continue;
        const id = `join_${randomId()}`;
        ids.push(id);
        this.pending.set(id, {
          client,
          resolve: (res) => settle(client, res),
        });
        this.publish(client, `${base}/h`, {
          t: 'cmd',
          id,
          from: this.myId,
          action: 'join_room',
          payload: { roomCode, playerName, appearance },
        });
      }

      if (!ids.length) settle(null, { ok: false, error: 'SERVER_UNREACHABLE' });
    });
  }

  private handleHostMessage(
    client: MqttClient,
    topic: string,
    payload: { toString: () => string },
  ): void {
    if (!this.isHosting || !this.engine || !this.currentRoomCode) return;
    if (!topic.endsWith('/h')) return;

    const message = parseMessage(payload);
    if (!message || message.t !== 'cmd' || !message.from) return;

    const response = dispatchEngineCommand(
      this.engine,
      message.from,
      message.action,
      message.payload ?? {},
    );

    if (message.id) {
      this.publish(client, `${topicBase(this.currentRoomCode)}/p/${message.from}`, {
        t: 'rep',
        id: message.id,
        res: response,
      });
    }
  }

  private handleGuestMessage(payload: { toString: () => string }): void {
    const message = parseMessage(payload);
    if (!message) return;

    if (message.t === 'state' && message.view) {
      this.emitState(message.view);
      return;
    }

    if (message.t === 'rep' && message.id) {
      const pending = this.pending.get(message.id);
      if (pending) {
        this.pending.delete(message.id);
        pending.resolve(message.res ?? { ok: false, error: 'INVALID_ACTION' });
      }
    }
  }

  private publishViews(viewsByPlayerId: Map<string, RoomViewState>): void {
    if (!this.currentRoomCode) return;
    const ownView = viewsByPlayerId.get(this.myId);
    if (ownView) this.emitState(ownView);

    const base = topicBase(this.currentRoomCode);
    for (const [playerId, view] of viewsByPlayerId.entries()) {
      if (playerId === this.myId) continue;
      this.publishToAll(`${base}/p/${playerId}`, { t: 'state', view });
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

    const client =
      this.cmdClient?.connected === true
        ? this.cmdClient
        : this.clients.find((candidate) => candidate.connected) ?? null;

    if (!client || !this.currentRoomCode) {
      return Promise.resolve({ ok: false, error: 'SERVER_UNREACHABLE' });
    }
    this.cmdClient = client;

    const id = `cmd_${randomId()}`;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(id)) resolve({ ok: false, error: 'SERVER_UNREACHABLE' });
      }, COMMAND_TIMEOUT_MS);

      this.pending.set(id, {
        client,
        resolve: (res) => {
          clearTimeout(timer);
          resolve(res as ActionResponse<T>);
        },
      });

      this.publish(client, `${topicBase(this.currentRoomCode!)}/h`, {
        t: 'cmd',
        id,
        from: this.myId,
        action,
        payload,
      });
    });
  }

  public leaveRoom(): void {
    if (this.isHosting && this.engine) {
      this.engine.leaveRoom(this.myId);
    } else if (this.cmdClient && this.currentRoomCode) {
      this.publish(this.cmdClient, `${topicBase(this.currentRoomCode)}/h`, {
        t: 'cmd',
        from: this.myId,
        action: 'leave_room',
        payload: {},
      });
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
    for (const pending of this.pending.values()) {
      pending.resolve({ ok: false, error: 'SERVER_UNREACHABLE' });
    }
    this.pending.clear();

    const clients = this.clients;
    this.clients = [];
    this.cmdClient = null;
    this.isHosting = false;
    this.currentRoomCode = null;

    for (const client of clients) {
      try {
        client.removeAllListeners('message');
        client.end(true);
      } catch {
        // Already closed.
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

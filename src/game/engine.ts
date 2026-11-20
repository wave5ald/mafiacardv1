import { ABILITIES } from '../shared/abilities';
import {
  BOT_NAMES_AR,
  BOT_NAMES_EN,
  createRandomAppearance,
  DEFAULT_APPEARANCE,
} from '../shared/catalog';
import {
  AbilityId,
  ActionResponse,
  AnnouncementEvent,
  CardActivationEvent,
  CharacterAppearance,
  Faction,
  GamePhase,
  GameSettings,
  Language,
  PlayerPublic,
  PrivateIntelMessage,
  Role,
  RoomViewState,
} from '../shared/types';
import {
  assignRolesAndCards,
  checkWinner,
  enforceMafiaCount,
  getSeatNeighbors,
  MAX_PLAYERS,
  resolveDayVotes,
  resolveNightPhase,
  sanitizeGameSettings,
  validatePlayerName,
} from './rules';

interface InternalPlayer {
  id: string;
  name: string;
  seatIndex: number;
  isHost: boolean;
  isBot: boolean;
  isReady: boolean;
  isConnected: boolean;
  alive: boolean;
  silenced: boolean;
  publiclyCleared: boolean;
  appearance: CharacterAppearance;
  role: Role | null;
  abilityId: AbilityId | null;
  abilityUsed: boolean;
  abilityActiveThisPhase: boolean;
  privateIntel: PrivateIntelMessage[];
  lastCardEvent: CardActivationEvent | null;
}

interface InternalRoom {
  roomCode: string;
  phase: GamePhase;
  roundNumber: number;
  phaseEndsAt: number;
  phaseDurationSec: number;
  settings: GameSettings;
  players: InternalPlayer[];
  announcements: AnnouncementEvent[];
  publicCardEvent: CardActivationEvent | null;
  winner: Faction | null;
  // Night tracking
  mafiaSelections: Record<string, string>;
  doctorTargets: string[];
  lastDoctorProtectedId: string | null;
  doctorCleanseTargetId: string | null;
  doctorSelfReviveArmed: boolean;
  detectiveTargets: string[];
  detectiveTrueIdentityActive: boolean;
  detectiveDoubleActive: boolean;
  doctorDoubleShieldActive: boolean;
  silencerTargetId: string | null;
  falseTrailTargetId: string | null;
  shadowSwapTargetId: string | null;
  bodyguardOwnerId: string | null;
  bodyguardTargetId: string | null;
  // Previous night visits for Suspect Tracker & Night Watch
  previousNightVisits: Record<string, string | null>;
  previousNightMafiaTargetId: string | null;
  // Day tracking
  votes: Record<string, string>; // voterId -> targetId | 'SKIP'
  doubleVoters: string[];
  voteThief: { victimId: string; forcedTargetId: string } | null;
  forceSkipVictimId: string | null;
  shieldedPlayerIds: string[];
  voteRedirects: Record<string, string>;
  tiebreakerVoterId: string | null;
  lastWillTargets: Record<string, string>; // ownerId -> suspectId
  // Timers
  phaseTimer: ReturnType<typeof setTimeout> | null;
  botTimers: Array<ReturnType<typeof setTimeout>>;
}

export const DEFAULT_SETTINGS: GameSettings = {
  mapId: 'city',
  mafiaCount: 1,
  minPlayers: 4,
  mafiaTimeSec: 30,
  doctorTimeSec: 30,
  detectiveTimeSec: 30,
  votingTimeSec: 45,
  skipVoteEnabled: true,
};

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function makeEventId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export type BroadcastCallback = (roomCode: string, viewsByPlayerId: Map<string, RoomViewState>) => void;

export class GameRoomEngine {
  private rooms = new Map<string, InternalRoom>();
  private playerToRoom = new Map<string, string>();
  private onBroadcast: BroadcastCallback;

  constructor(onBroadcast: BroadcastCallback) {
    this.onBroadcast = onBroadcast;
  }

  public dispose(): void {
    for (const room of this.rooms.values()) {
      this.clearRoomTimers(room);
    }
    this.rooms.clear();
    this.playerToRoom.clear();
  }

  public getRoomCodeForPlayer(playerId: string): string | undefined {
    return this.playerToRoom.get(playerId);
  }

  public createRoom(
    playerId: string,
    rawName: string,
    appearance?: CharacterAppearance,
    preferredCode?: string,
  ): ActionResponse<{ roomCode: string }> {
    const check = validatePlayerName(rawName);
    if (!check.valid) {
      return { ok: false, error: check.error };
    }

    this.leaveRoom(playerId);

    let roomCode = preferredCode?.trim().toUpperCase() || generateRoomCode();
    while (this.rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const hostPlayer: InternalPlayer = {
      id: playerId,
      name: check.trimmed,
      seatIndex: 0,
      isHost: true,
      isBot: false,
      isReady: false,
      isConnected: true,
      alive: true,
      silenced: false,
      publiclyCleared: false,
      appearance: appearance ? { ...appearance } : { ...DEFAULT_APPEARANCE },
      role: null,
      abilityId: null,
      abilityUsed: false,
      abilityActiveThisPhase: false,
      privateIntel: [],
      lastCardEvent: null,
    };

    const room: InternalRoom = {
      roomCode,
      phase: 'LOBBY',
      roundNumber: 0,
      phaseEndsAt: 0,
      phaseDurationSec: 0,
      settings: { ...DEFAULT_SETTINGS },
      players: [hostPlayer],
      announcements: [],
      publicCardEvent: null,
      winner: null,
      mafiaSelections: {},
      doctorTargets: [],
      lastDoctorProtectedId: null,
      doctorCleanseTargetId: null,
      doctorSelfReviveArmed: false,
      detectiveTargets: [],
      detectiveTrueIdentityActive: false,
      detectiveDoubleActive: false,
      doctorDoubleShieldActive: false,
      silencerTargetId: null,
      falseTrailTargetId: null,
      shadowSwapTargetId: null,
      bodyguardOwnerId: null,
      bodyguardTargetId: null,
      previousNightVisits: {},
      previousNightMafiaTargetId: null,
      votes: {},
      doubleVoters: [],
      voteThief: null,
      forceSkipVictimId: null,
      shieldedPlayerIds: [],
      voteRedirects: {},
      tiebreakerVoterId: null,
      lastWillTargets: {},
      phaseTimer: null,
      botTimers: [],
    };

    this.rooms.set(roomCode, room);
    this.playerToRoom.set(playerId, roomCode);
    this.broadcastRoom(room);
    return { ok: true, data: { roomCode } };
  }

  public joinRoom(
    playerId: string,
    rawRoomCode: string,
    rawName: string,
    appearance?: CharacterAppearance,
  ): ActionResponse<{ roomCode: string }> {
    const check = validatePlayerName(rawName);
    if (!check.valid) {
      return { ok: false, error: check.error };
    }

    const code = (rawRoomCode || '').trim().toUpperCase();
    const room = this.rooms.get(code);
    if (!room) {
      return { ok: false, error: 'ROOM_NOT_FOUND' };
    }
    if (room.phase !== 'LOBBY') {
      return { ok: false, error: 'GAME_ALREADY_STARTED' };
    }

    const existing = room.players.find((p) => p.id === playerId);
    if (existing) {
      existing.name = check.trimmed;
      existing.isConnected = true;
      this.broadcastRoom(room);
      return { ok: true, data: { roomCode: code } };
    }

    if (room.players.length >= MAX_PLAYERS) {
      return { ok: false, error: 'ROOM_FULL' };
    }

    this.leaveRoom(playerId);

    const usedSeats = new Set(room.players.map((p) => p.seatIndex));
    let seatIndex = 0;
    while (usedSeats.has(seatIndex)) seatIndex++;

    const newPlayer: InternalPlayer = {
      id: playerId,
      name: check.trimmed,
      seatIndex,
      isHost: false,
      isBot: false,
      isReady: false,
      isConnected: true,
      alive: true,
      silenced: false,
      publiclyCleared: false,
      appearance: appearance ? { ...appearance } : createRandomAppearance(seatIndex + 2),
      role: null,
      abilityId: null,
      abilityUsed: false,
      abilityActiveThisPhase: false,
      privateIntel: [],
      lastCardEvent: null,
    };

    room.players.push(newPlayer);
    this.playerToRoom.set(playerId, code);
    room.settings.mafiaCount = enforceMafiaCount(room.players.length, room.settings.mafiaCount);
    this.broadcastRoom(room);
    return { ok: true, data: { roomCode: code } };
  }

  public leaveRoom(playerId: string): void {
    const code = this.playerToRoom.get(playerId);
    if (!code) return;
    this.playerToRoom.delete(playerId);

    const room = this.rooms.get(code);
    if (!room) return;

    if (room.phase === 'LOBBY') {
      room.players = room.players.filter((p) => p.id !== playerId);
      const humanLeft = room.players.some((p) => !p.isBot);
      if (room.players.length === 0 || !humanLeft) {
        this.clearRoomTimers(room);
        for (const p of room.players) {
          this.playerToRoom.delete(p.id);
        }
        this.rooms.delete(code);
        return;
      }
      if (!room.players.some((p) => p.isHost)) {
        const nextHost = room.players.find((p) => !p.isBot) ?? room.players[0];
        if (nextHost) nextHost.isHost = true;
      }
      room.settings.mafiaCount = enforceMafiaCount(room.players.length, room.settings.mafiaCount);
      this.broadcastRoom(room);
    } else {
      // Mid-game disconnect: mark disconnected & auto-convert to bot decision if alive so match never soft-locks
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.isConnected = false;
        player.isBot = true;
      }
      const anyHumanConnected = room.players.some((p) => !p.isBot && p.isConnected);
      if (!anyHumanConnected) {
        this.clearRoomTimers(room);
        for (const p of room.players) {
          this.playerToRoom.delete(p.id);
        }
        this.rooms.delete(code);
        return;
      }
      this.broadcastRoom(room);
    }
  }

  public addBot(requesterId: string, lang: Language = 'en'): ActionResponse {
    const room = this.getRoomByPlayer(requesterId);
    if (!room || room.phase !== 'LOBBY') return { ok: false, error: 'INVALID_ACTION' };
    const req = room.players.find((p) => p.id === requesterId);
    if (!req?.isHost) return { ok: false, error: 'NOT_HOST' };
    if (room.players.length >= MAX_PLAYERS) return { ok: false, error: 'ROOM_FULL' };

    const usedSeats = new Set(room.players.map((p) => p.seatIndex));
    let seatIndex = 0;
    while (usedSeats.has(seatIndex)) seatIndex++;

    const usedNames = new Set(room.players.map((p) => p.name.toLowerCase()));
    const pool = lang === 'ar' ? BOT_NAMES_AR : BOT_NAMES_EN;
    let botName = pool.find((n) => !usedNames.has(n.toLowerCase()));
    if (!botName) {
      botName = lang === 'ar' ? `بوت ${seatIndex + 1}` : `Bot ${seatIndex + 1}`;
    }

    const bot: InternalPlayer = {
      id: `bot_${makeEventId()}`,
      name: botName,
      seatIndex,
      isHost: false,
      isBot: true,
      isReady: true,
      isConnected: true,
      alive: true,
      silenced: false,
      publiclyCleared: false,
      appearance: createRandomAppearance(seatIndex + room.players.length * 3),
      role: null,
      abilityId: null,
      abilityUsed: false,
      abilityActiveThisPhase: false,
      privateIntel: [],
      lastCardEvent: null,
    };

    room.players.push(bot);
    this.playerToRoom.set(bot.id, room.roomCode);
    room.settings.mafiaCount = enforceMafiaCount(room.players.length, room.settings.mafiaCount);
    this.broadcastRoom(room);
    return { ok: true };
  }

  public removeBot(requesterId: string, botId?: string): ActionResponse {
    const room = this.getRoomByPlayer(requesterId);
    if (!room || room.phase !== 'LOBBY') return { ok: false, error: 'INVALID_ACTION' };
    const req = room.players.find((p) => p.id === requesterId);
    if (!req?.isHost) return { ok: false, error: 'NOT_HOST' };

    const targetBot = botId
      ? room.players.find((p) => p.id === botId && p.isBot)
      : [...room.players].reverse().find((p) => p.isBot);
    if (!targetBot) return { ok: false, error: 'INVALID_ACTION' };

    room.players = room.players.filter((p) => p.id !== targetBot.id);
    this.playerToRoom.delete(targetBot.id);
    room.settings.mafiaCount = enforceMafiaCount(room.players.length, room.settings.mafiaCount);
    this.broadcastRoom(room);
    return { ok: true };
  }

  public updateAppearance(playerId: string, appearance: CharacterAppearance): ActionResponse {
    const room = this.getRoomByPlayer(playerId);
    if (!room || room.phase !== 'LOBBY') return { ok: false, error: 'INVALID_ACTION' };
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, error: 'INVALID_ACTION' };

    player.appearance = {
      gender: appearance.gender === 'female' ? 'female' : 'male',
      suitId: Math.max(0, Math.min(9, Math.floor(Number(appearance.suitId) || 0))),
      pantsId: Math.max(0, Math.min(9, Math.floor(Number(appearance.pantsId) || 0))),
      hatId:
        appearance.hatId === 'none'
          ? 'none'
          : Math.max(0, Math.min(9, Math.floor(Number(appearance.hatId) || 0))),
      hairId: Math.max(0, Math.min(9, Math.floor(Number(appearance.hairId) || 0))),
      skinColor: appearance.skinColor,
      hairColor: appearance.hairColor,
    };
    this.broadcastRoom(room);
    return { ok: true };
  }

  public setReady(playerId: string, isReady: boolean): ActionResponse {
    const room = this.getRoomByPlayer(playerId);
    if (!room || room.phase !== 'LOBBY') return { ok: false, error: 'INVALID_ACTION' };
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, error: 'INVALID_ACTION' };

    player.isReady = isReady;
    this.broadcastRoom(room);
    return { ok: true };
  }

  public updateSettings(requesterId: string, patch: Partial<GameSettings>): ActionResponse {
    const room = this.getRoomByPlayer(requesterId);
    if (!room || room.phase !== 'LOBBY') return { ok: false, error: 'INVALID_ACTION' };
    const player = room.players.find((p) => p.id === requesterId);
    if (!player?.isHost) return { ok: false, error: 'NOT_HOST' };

    room.settings = sanitizeGameSettings(room.settings, patch, room.players.length);
    this.broadcastRoom(room);
    return { ok: true };
  }

  public startGame(requesterId: string): ActionResponse {
    const room = this.getRoomByPlayer(requesterId);
    if (!room || room.phase !== 'LOBBY') return { ok: false, error: 'INVALID_ACTION' };
    const requester = room.players.find((p) => p.id === requesterId);
    if (!requester?.isHost) return { ok: false, error: 'NOT_HOST' };

    const requiredMin = Math.max(4, room.settings.minPlayers);
    if (room.players.length < requiredMin) {
      return { ok: false, error: 'MIN_PLAYERS_REQUIRED' };
    }
    if (!room.players.every((p) => p.isReady)) {
      return { ok: false, error: 'NOT_ALL_READY' };
    }

    this.initializeMatch(room);
    return { ok: true };
  }

  public returnToLobby(requesterId: string): ActionResponse {
    const room = this.getRoomByPlayer(requesterId);
    if (!room) return { ok: false, error: 'INVALID_ACTION' };
    this.clearRoomTimers(room);

    room.phase = 'LOBBY';
    room.roundNumber = 0;
    room.winner = null;
    room.announcements = [];
    room.publicCardEvent = null;
    room.votes = {};
    room.mafiaSelections = {};
    room.doctorTargets = [];
    room.detectiveTargets = [];
    room.lastDoctorProtectedId = null;

    for (const p of room.players) {
      p.alive = true;
      p.silenced = false;
      p.publiclyCleared = false;
      p.role = null;
      p.abilityId = null;
      p.abilityUsed = false;
      p.abilityActiveThisPhase = false;
      p.privateIntel = [];
      p.lastCardEvent = null;
      p.isReady = p.isBot;
    }

    this.broadcastRoom(room);
    return { ok: true };
  }

  public playAgain(requesterId: string): ActionResponse {
    const room = this.getRoomByPlayer(requesterId);
    if (!room || room.phase !== 'GAME_OVER') return { ok: false, error: 'INVALID_ACTION' };
    const req = room.players.find((p) => p.id === requesterId);
    if (!req?.isHost) return { ok: false, error: 'NOT_HOST' };
    this.initializeMatch(room);
    return { ok: true };
  }

  private hasUsableNightCardForPhase(player: InternalPlayer, phase: GamePhase): boolean {
    if (player.isBot || !player.abilityId || player.abilityUsed) return false;
    const def = ABILITIES[player.abilityId];
    if (!def) return false;
    // Emergency self-revive is passively armed from match start, so it never needs to pause Doctor's auto-skip
    if (player.abilityId === 'emergency_self_revive') return false;
    return def.timing === phase;
  }

  private tryAutoAdvanceNightMafia(room: InternalRoom, forceConfirm = false): void {
    const livingMafias = room.players.filter((p) => p.alive && p.role === 'mafia');
    if (livingMafias.length === 0) return;
    const allPicked = livingMafias.every((m) => Boolean(room.mafiaSelections[m.id]));
    const uniqueTargets = new Set(livingMafias.map((m) => room.mafiaSelections[m.id]));
    if (!allPicked || uniqueTargets.size !== 1) return;

    const anyHumanHoldingNightCard =
      !forceConfirm && livingMafias.some((m) => this.hasUsableNightCardForPhase(m, 'NIGHT_MAFIA'));
    if (!anyHumanHoldingNightCard) {
      this.scheduleEarlyAdvance(room, 1200, () => this.enterNightDoctor(room));
    }
  }

  private tryAutoAdvanceNightDoctor(room: InternalRoom, doc: InternalPlayer, forceConfirm = false): void {
    const requiredTargets = room.doctorDoubleShieldActive ? 2 : 1;
    if (room.doctorTargets.length < requiredTargets) return;

    const holdingNightCard =
      !forceConfirm && this.hasUsableNightCardForPhase(doc, 'NIGHT_DOCTOR');
    if (!holdingNightCard) {
      this.scheduleEarlyAdvance(room, 1200, () => this.enterNightDetective(room));
    }
  }

  public submitNightTarget(playerId: string, targetId: string): ActionResponse {
    const room = this.getRoomByPlayer(playerId);
    if (!room) return { ok: false, error: 'INVALID_ACTION' };
    const player = room.players.find((p) => p.id === playerId);
    const target = room.players.find((p) => p.id === targetId && p.alive);
    if (!player || !player.alive || !target) return { ok: false, error: 'INVALID_ACTION' };

    if (room.phase === 'NIGHT_MAFIA' && player.role === 'mafia') {
      if (target.role === 'mafia') return { ok: false, error: 'INVALID_ACTION' };
      const reclickedSameTarget = room.mafiaSelections[playerId] === targetId;
      room.mafiaSelections[playerId] = targetId;
      this.broadcastRoom(room);
      this.tryAutoAdvanceNightMafia(room, reclickedSameTarget);
      return { ok: true };
    }

    if (room.phase === 'NIGHT_DOCTOR' && player.role === 'doctor') {
      const canDouble = room.doctorDoubleShieldActive;
      // Consecutive protection rule (unless double_shield or cleanse_guard is active)
      if (
        !canDouble &&
        room.doctorCleanseTargetId !== targetId &&
        room.lastDoctorProtectedId === targetId
      ) {
        return { ok: false, error: 'CONSECUTIVE_PROTECT_BLOCKED' };
      }

      if (canDouble) {
        if (room.doctorTargets.includes(targetId)) {
          room.doctorTargets = room.doctorTargets.filter((id) => id !== targetId);
        } else if (room.doctorTargets.length < 2) {
          room.doctorTargets.push(targetId);
        } else {
          room.doctorTargets = [room.doctorTargets[1], targetId];
        }
        this.broadcastRoom(room);
        this.tryAutoAdvanceNightDoctor(room, player, false);
      } else {
        const reclickedSame = room.doctorTargets.length === 1 && room.doctorTargets[0] === targetId;
        room.doctorTargets = [targetId];
        this.broadcastRoom(room);
        this.tryAutoAdvanceNightDoctor(room, player, reclickedSame);
      }
      return { ok: true };
    }

    if (room.phase === 'NIGHT_DETECTIVE' && player.role === 'detective') {
      if (targetId === playerId) return { ok: false, error: 'INVALID_ACTION' };
      const maxTargets = room.detectiveDoubleActive ? 2 : 1;
      if (room.detectiveTargets.includes(targetId)) {
        return { ok: true };
      }
      if (room.detectiveTargets.length >= maxTargets) {
        return { ok: false, error: 'INVALID_ACTION' };
      }

      room.detectiveTargets.push(targetId);
      // Record private inspection intel immediately for Detective
      const framed = room.falseTrailTargetId === targetId && room.doctorCleanseTargetId !== targetId;
      const appearsMafia = framed || target.role === 'mafia';
      const intel: PrivateIntelMessage = {
        id: makeEventId(),
        kind: 'detective_result',
        targetId: target.id,
        targetName: target.name,
        isMafia: appearsMafia,
        exactRole: room.detectiveTrueIdentityActive ? (target.role ?? 'civilian') : undefined,
        timestamp: Date.now(),
      };
      player.privateIntel = [intel, ...player.privateIntel].slice(0, 6);
      this.broadcastRoom(room);

      if (room.detectiveTargets.length >= maxTargets) {
        this.scheduleEarlyAdvance(room, 2500, () => this.enterDayAnnounce(room));
      }
      return { ok: true };
    }

    return { ok: false, error: 'INVALID_ACTION' };
  }

  public confirmNightAction(playerId: string): ActionResponse {
    const room = this.getRoomByPlayer(playerId);
    if (!room) return { ok: false, error: 'INVALID_ACTION' };
    const player = room.players.find((p) => p.id === playerId && p.alive);
    if (!player) return { ok: false, error: 'INVALID_ACTION' };

    if (room.phase === 'NIGHT_MAFIA' && player.role === 'mafia') {
      if (!room.mafiaSelections[playerId]) return { ok: false, error: 'INVALID_ACTION' };
      this.tryAutoAdvanceNightMafia(room, true);
      return { ok: true };
    }

    if (room.phase === 'NIGHT_DOCTOR' && player.role === 'doctor') {
      const required = room.doctorDoubleShieldActive ? 2 : 1;
      if (room.doctorTargets.length < required) return { ok: false, error: 'INVALID_ACTION' };
      this.tryAutoAdvanceNightDoctor(room, player, true);
      return { ok: true };
    }

    return { ok: false, error: 'INVALID_ACTION' };
  }

  public continuePhase(playerId: string): ActionResponse {
    const room = this.getRoomByPlayer(playerId);
    if (!room) return { ok: false, error: 'INVALID_ACTION' };
    const player = room.players.find((p) => p.id === playerId && p.alive);
    if (!player) return { ok: false, error: 'INVALID_ACTION' };

    if (room.phase === 'NIGHT_DETECTIVE' && player.role === 'detective') {
      const required = room.detectiveDoubleActive ? 2 : 1;
      if (room.detectiveTargets.length >= required) {
        this.scheduleEarlyAdvance(room, 150, () => this.enterDayAnnounce(room));
        return { ok: true };
      }
    }

    return { ok: false, error: 'INVALID_ACTION' };
  }

  public submitDayVote(playerId: string, targetId: string | 'SKIP'): ActionResponse {
    const room = this.getRoomByPlayer(playerId);
    if (!room || room.phase !== 'DAY_VOTE') return { ok: false, error: 'INVALID_ACTION' };
    const player = room.players.find((p) => p.id === playerId && p.alive);
    if (!player) return { ok: false, error: 'INVALID_ACTION' };

    if (targetId === 'SKIP') {
      if (!room.settings.skipVoteEnabled) return { ok: false, error: 'INVALID_ACTION' };
      room.votes[playerId] = 'SKIP';
    } else {
      const target = room.players.find((p) => p.id === targetId && p.alive);
      if (!target || target.id === playerId) return { ok: false, error: 'INVALID_ACTION' };
      room.votes[playerId] = targetId;
    }

    this.broadcastRoom(room);

    const living = room.players.filter((p) => p.alive);
    if (living.every((p) => Boolean(room.votes[p.id]))) {
      this.scheduleEarlyAdvance(room, 1200, () => this.resolveDayAndContinue(room));
    }
    return { ok: true };
  }

  public activateAbility(
    playerId: string,
    targetId?: string,
    secondTargetId?: string,
  ): ActionResponse {
    const room = this.getRoomByPlayer(playerId);
    if (!room) return { ok: false, error: 'INVALID_ACTION' };
    const player = room.players.find((p) => p.id === playerId && p.alive);
    if (!player || !player.abilityId || player.abilityUsed || !player.role) {
      return { ok: false, error: 'INVALID_ACTION' };
    }
    if (player.silenced && room.phase === 'DAY_VOTE') {
      return { ok: false, error: 'SILENCED_BLOCKED' };
    }

    const def = ABILITIES[player.abilityId];
    if (!def) return { ok: false, error: 'INVALID_ACTION' };

    // Validate phase timing
    const phaseOk =
      def.timing === room.phase ||
      (def.timing === 'PASSIVE_OR_NIGHT' &&
        (room.phase === 'NIGHT_DOCTOR' || room.phase === 'DAY_VOTE'));
    if (!phaseOk) {
      return { ok: false, error: 'INVALID_ACTION' };
    }

    const t1 = targetId ? room.players.find((p) => p.id === targetId && p.alive) : undefined;
    const t2 = secondTargetId
      ? room.players.find((p) => p.id === secondTargetId && p.alive)
      : undefined;

    if (def.targetCount >= 1 && !t1) return { ok: false, error: 'INVALID_ACTION' };
    if (def.targetCount >= 2 && !t2) return { ok: false, error: 'INVALID_ACTION' };
    if (!def.allowSelfTarget && t1 && t1.id === player.id) {
      return { ok: false, error: 'INVALID_ACTION' };
    }

    // Apply effect per ability
    switch (player.abilityId) {
      // MAFIA
      case 'vote_thief':
        if (!t1 || !t2 || t1.id === t2.id) return { ok: false, error: 'INVALID_ACTION' };
        room.voteThief = { victimId: t1.id, forcedTargetId: t2.id };
        break;
      case 'silencer':
        if (!t1) return { ok: false, error: 'INVALID_ACTION' };
        room.silencerTargetId = t1.id;
        break;
      case 'false_trail':
        if (!t1) return { ok: false, error: 'INVALID_ACTION' };
        room.falseTrailTargetId = t1.id;
        break;
      case 'shadow_swap':
        if (!t1) return { ok: false, error: 'INVALID_ACTION' };
        room.shadowSwapTargetId = t1.id;
        break;
      case 'double_ballot':
        room.doubleVoters.push(player.id);
        break;

      // DOCTOR
      case 'double_shield':
        room.doctorDoubleShieldActive = true;
        break;
      case 'emergency_self_revive':
        room.doctorSelfReviveArmed = true;
        break;
      case 'cleanse_guard':
        if (!t1) return { ok: false, error: 'INVALID_ACTION' };
        room.doctorCleanseTargetId = t1.id;
        if (!room.doctorTargets.includes(t1.id)) {
          room.doctorTargets = [t1.id];
        }
        break;

      // DETECTIVE
      case 'true_identity':
        room.detectiveTrueIdentityActive = true;
        break;
      case 'double_investigation':
        room.detectiveDoubleActive = true;
        break;
      case 'suspect_tracker': {
        if (!t1) return { ok: false, error: 'INVALID_ACTION' };
        const visitedId = room.previousNightVisits[t1.id] ?? null;
        const visitedPlayer = visitedId ? room.players.find((p) => p.id === visitedId) : null;
        const trackerMsg: PrivateIntelMessage = {
          id: makeEventId(),
          kind: 'tracker_result',
          targetId: t1.id,
          targetName: t1.name,
          visitedName: visitedPlayer?.name,
          timestamp: Date.now(),
        };
        player.privateIntel = [trackerMsg, ...player.privateIntel].slice(0, 6);
        break;
      }

      // CIVILIAN
      case 'force_skip':
        if (!t1) return { ok: false, error: 'INVALID_ACTION' };
        room.forceSkipVictimId = t1.id;
        break;
      case 'shielded_vote':
        room.shieldedPlayerIds.push(player.id);
        break;
      case 'double_vote':
        room.doubleVoters.push(player.id);
        break;
      case 'last_will':
        if (!t1) return { ok: false, error: 'INVALID_ACTION' };
        room.lastWillTargets[player.id] = t1.id;
        break;
      case 'bodyguard':
        if (!t1) return { ok: false, error: 'INVALID_ACTION' };
        room.bodyguardOwnerId = player.id;
        room.bodyguardTargetId = t1.id;
        break;
      case 'public_reveal': {
        const candidates = room.players.filter(
          (p) => p.alive && p.id !== player.id && p.role !== 'mafia' && !p.publiclyCleared,
        );
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        if (pick) {
          pick.publiclyCleared = true;
          const pubEv: AnnouncementEvent = {
            id: makeEventId(),
            key: 'public_innocent',
            playerName: pick.name,
            timestamp: Date.now(),
          };
          room.announcements = [pubEv, ...room.announcements].slice(0, 5);
        }
        break;
      }
      case 'time_freeze': {
        room.phaseEndsAt += 20_000;
        room.phaseDurationSec += 20;
        if (room.phaseTimer) {
          clearTimeout(room.phaseTimer);
          const remaining = Math.max(1000, room.phaseEndsAt - Date.now());
          room.phaseTimer = setTimeout(() => this.resolveDayAndContinue(room), remaining);
        }
        const freezeEv: AnnouncementEvent = {
          id: makeEventId(),
          key: 'time_frozen',
          timestamp: Date.now(),
        };
        room.announcements = [freezeEv, ...room.announcements].slice(0, 5);
        break;
      }
      case 'vote_redirect':
        if (!t1) return { ok: false, error: 'INVALID_ACTION' };
        room.voteRedirects[player.id] = t1.id;
        break;
      case 'night_watch': {
        const neighbors = getSeatNeighbors(room.players, player.id);
        const danger = Boolean(
          room.previousNightMafiaTargetId && neighbors.includes(room.previousNightMafiaTargetId),
        );
        const watchMsg: PrivateIntelMessage = {
          id: makeEventId(),
          kind: 'night_watch',
          alertActive: danger,
          timestamp: Date.now(),
        };
        player.privateIntel = [watchMsg, ...player.privateIntel].slice(0, 6);
        break;
      }
      case 'tiebreaker':
        room.tiebreakerVoterId = player.id;
        break;
    }

    player.abilityUsed = true;
    player.abilityActiveThisPhase = true;

    const cardEvent: CardActivationEvent = {
      id: makeEventId(),
      abilityId: player.abilityId,
      casterId: player.id,
      casterName: player.name,
      casterRole: player.role,
      targetName: t1?.name,
      secondTargetName: t2?.name,
      isPublic: def.isPublicAnnouncement,
      timestamp: Date.now(),
    };

    player.lastCardEvent = cardEvent;
    if (def.isPublicAnnouncement) {
      room.publicCardEvent = cardEvent;
    }

    this.broadcastRoom(room);

    // If a night role had already locked their target and just spent their card, auto-advance cleanly
    if (room.phase === 'NIGHT_MAFIA' && player.role === 'mafia') {
      this.tryAutoAdvanceNightMafia(room, false);
    } else if (room.phase === 'NIGHT_DOCTOR' && player.role === 'doctor') {
      this.tryAutoAdvanceNightDoctor(room, player, false);
    }

    return { ok: true };
  }

  // === INTERNAL STATE MACHINE ===

  private initializeMatch(room: InternalRoom): void {
    this.clearRoomTimers(room);
    room.roundNumber = 1;
    room.winner = null;
    room.announcements = [];
    room.publicCardEvent = null;
    room.lastDoctorProtectedId = null;
    room.previousNightVisits = {};
    room.previousNightMafiaTargetId = null;
    room.lastWillTargets = {};
    room.bodyguardOwnerId = null;
    room.bodyguardTargetId = null;
    room.settings.mafiaCount = enforceMafiaCount(room.players.length, room.settings.mafiaCount);

    const assignment = assignRolesAndCards(
      room.players.map((p) => p.id),
      room.settings.mafiaCount,
    );

    room.doctorSelfReviveArmed = false;

    for (const p of room.players) {
      p.alive = true;
      p.silenced = false;
      p.publiclyCleared = false;
      p.role = assignment.roles[p.id];
      p.abilityId = assignment.abilities[p.id];
      p.abilityUsed = false;
      p.abilityActiveThisPhase = false;
      p.privateIntel = [];
      p.lastCardEvent = null;
      // Arm Emergency Self-Revive passively right from match start so Doctor survives automatically if hit
      if (p.role === 'doctor' && p.abilityId === 'emergency_self_revive') {
        room.doctorSelfReviveArmed = true;
      }
    }

    this.setPhase(room, 'ROLE_REVEAL', 5, () => this.enterNightSleep(room));
  }

  private enterNightSleep(room: InternalRoom): void {
    this.resetNightScratch(room);
    this.setPhase(room, 'NIGHT_SLEEP', 3, () => this.enterNightMafia(room));
  }

  private enterNightMafia(room: InternalRoom): void {
    const livingMafias = room.players.filter((p) => p.alive && p.role === 'mafia');
    if (livingMafias.length === 0) {
      this.enterNightDoctor(room);
      return;
    }
    const sec = room.settings.mafiaTimeSec;
    this.setPhase(room, 'NIGHT_MAFIA', sec, () => this.enterNightDoctor(room));
    this.scheduleBotNightMafia(room);
  }

  private enterNightDoctor(room: InternalRoom): void {
    const doc = room.players.find((p) => p.alive && p.role === 'doctor');
    if (!doc) {
      // Keep suspenseful brief turn (2.5s–3.5s randomized) if Doctor is already eliminated
      const briefSec = 2.5 + Math.random();
      this.setPhase(room, 'NIGHT_DOCTOR', briefSec, () => this.enterNightDetective(room));
      return;
    }
    const sec = room.settings.doctorTimeSec;
    this.setPhase(room, 'NIGHT_DOCTOR', sec, () => this.enterNightDetective(room));
    if (doc.isBot) {
      this.scheduleBotNightDoctor(room, doc);
    }
  }

  private enterNightDetective(room: InternalRoom): void {
    const det = room.players.find((p) => p.alive && p.role === 'detective');
    if (!det) {
      // Keep suspenseful brief turn (2.5s–3.5s randomized) if Detective is already eliminated
      const briefSec = 2.5 + Math.random();
      this.setPhase(room, 'NIGHT_DETECTIVE', briefSec, () => this.enterDayAnnounce(room));
      return;
    }
    const sec = room.settings.detectiveTimeSec;
    this.setPhase(room, 'NIGHT_DETECTIVE', sec, () => this.enterDayAnnounce(room));
    if (det.isBot) {
      this.scheduleBotNightDetective(room, det);
    }
  }

  private enterDayAnnounce(room: InternalRoom): void {
    const doc = room.players.find((p) => p.alive && p.role === 'doctor') ?? null;

    // Record night visits for Suspect Tracker next round
    const visits: Record<string, string | null> = {};
    for (const p of room.players) {
      visits[p.id] = null;
    }
    for (const [mafiaId, tId] of Object.entries(room.mafiaSelections)) {
      visits[mafiaId] = tId;
    }
    if (doc && room.doctorTargets[0]) {
      visits[doc.id] = room.doctorTargets[0];
    }
    const det = room.players.find((p) => p.alive && p.role === 'detective');
    if (det && room.detectiveTargets[0]) {
      visits[det.id] = room.detectiveTargets[0];
    }
    room.previousNightVisits = visits;

    const result = resolveNightPhase({
      mafiaSelections: room.mafiaSelections,
      doctorId: doc?.id ?? null,
      doctorProtectedIds: room.doctorTargets,
      doctorCleanseTargetId: room.doctorCleanseTargetId,
      doctorSelfReviveArmed: room.doctorSelfReviveArmed,
      bodyguardTargetId: room.bodyguardTargetId,
      shadowSwapTargetId: room.shadowSwapTargetId,
      silencerTargetId: room.silencerTargetId,
      falseTrailTargetId: room.falseTrailTargetId,
    });

    room.previousNightMafiaTargetId = result.chosenMafiaTargetId;
    room.lastDoctorProtectedId = room.doctorTargets.length === 1 ? room.doctorTargets[0] : null;
    room.bodyguardTargetId = null;
    room.bodyguardOwnerId = null;

    if (result.selfReviveConsumed && doc) {
      room.doctorSelfReviveArmed = false;
      doc.abilityUsed = true;
    }

    // Apply silencer for upcoming Day
    for (const p of room.players) {
      p.silenced = result.silencedId === p.id;
    }

    const events: AnnouncementEvent[] = [];

    if (result.eliminatedId) {
      const victim = room.players.find((p) => p.id === result.eliminatedId);
      if (victim) {
        victim.alive = false;
        events.push({
          id: makeEventId(),
          key: 'night_killed',
          playerName: victim.name,
          role: victim.role ?? undefined,
          timestamp: Date.now(),
        });
        this.triggerLastWillIfPresent(room, victim.id, events);
      }
    } else if (result.saved) {
      events.push({
        id: makeEventId(),
        key: 'night_saved',
        timestamp: Date.now(),
      });
    } else {
      events.push({
        id: makeEventId(),
        key: 'night_quiet',
        timestamp: Date.now(),
      });
    }

    if (result.silencedId) {
      const muted = room.players.find((p) => p.id === result.silencedId && p.alive);
      if (muted) {
        events.push({
          id: makeEventId(),
          key: 'player_silenced',
          playerName: muted.name,
          timestamp: Date.now(),
        });
      }
    }

    room.announcements = events;

    const winner = checkWinner(room.players);
    if (winner) {
      this.enterGameOver(room, winner);
      return;
    }

    this.setPhase(room, 'DAY_ANNOUNCE', 4, () => this.enterDayVote(room));
  }

  private enterDayVote(room: InternalRoom): void {
    room.votes = {};
    room.doubleVoters = [];
    room.voteThief = null;
    room.forceSkipVictimId = null;
    room.shieldedPlayerIds = [];
    room.voteRedirects = {};
    room.tiebreakerVoterId = null;
    room.publicCardEvent = null;
    for (const p of room.players) {
      p.abilityActiveThisPhase = false;
    }

    this.setPhase(room, 'DAY_VOTE', room.settings.votingTimeSec, () =>
      this.resolveDayAndContinue(room),
    );
    this.scheduleBotDayVotes(room);
  }

  private resolveDayAndContinue(room: InternalRoom): void {
    const aliveIds = room.players.filter((p) => p.alive).map((p) => p.id);
    const voteResult = resolveDayVotes({
      alivePlayerIds: aliveIds,
      rawVotes: room.votes,
      doubleVoters: room.doubleVoters,
      voteThief: room.voteThief,
      forceSkipVictimId: room.forceSkipVictimId,
      shieldedPlayerIds: room.shieldedPlayerIds,
      voteRedirects: room.voteRedirects,
      tiebreakerVoterId: room.tiebreakerVoterId,
    });

    const events: AnnouncementEvent[] = [];
    if (voteResult.outcome === 'eliminated' && voteResult.eliminatedId) {
      const victim = room.players.find((p) => p.id === voteResult.eliminatedId);
      if (victim) {
        victim.alive = false;
        events.push({
          id: makeEventId(),
          key: 'day_eliminated',
          playerName: victim.name,
          role: victim.role ?? undefined,
          timestamp: Date.now(),
        });
        this.triggerLastWillIfPresent(room, victim.id, events);
      }
    } else if (voteResult.outcome === 'skipped') {
      events.push({
        id: makeEventId(),
        key: 'day_skipped',
        timestamp: Date.now(),
      });
    } else {
      events.push({
        id: makeEventId(),
        key: 'day_tie',
        timestamp: Date.now(),
      });
    }

    room.announcements = events;

    const winner = checkWinner(room.players);
    if (winner) {
      this.enterGameOver(room, winner);
      return;
    }

    room.roundNumber += 1;
    this.setPhase(room, 'DAY_ANNOUNCE', 4, () => this.enterNightSleep(room));
  }

  private enterGameOver(room: InternalRoom, winner: Faction): void {
    this.clearRoomTimers(room);
    room.phase = 'GAME_OVER';
    room.winner = winner;
    room.phaseEndsAt = 0;
    room.phaseDurationSec = 0;
    this.broadcastRoom(room);
  }

  private triggerLastWillIfPresent(
    room: InternalRoom,
    victimId: string,
    events: AnnouncementEvent[],
  ): void {
    const suspectId = room.lastWillTargets[victimId];
    if (!suspectId) return;
    delete room.lastWillTargets[victimId];
    const suspect = room.players.find((p) => p.id === suspectId);
    if (!suspect) return;
    events.push({
      id: makeEventId(),
      key: 'last_will_reveal',
      playerName: suspect.name,
      isMafia: suspect.role === 'mafia',
      timestamp: Date.now(),
    });
  }

  private resetNightScratch(room: InternalRoom): void {
    room.mafiaSelections = {};
    room.doctorTargets = [];
    room.doctorCleanseTargetId = null;
    room.detectiveTargets = [];
    room.detectiveTrueIdentityActive = false;
    room.detectiveDoubleActive = false;
    room.doctorDoubleShieldActive = false;
    room.silencerTargetId = null;
    room.falseTrailTargetId = null;
    room.shadowSwapTargetId = null;
    room.publicCardEvent = null;
    for (const p of room.players) {
      p.abilityActiveThisPhase = false;
    }
  }

  private setPhase(
    room: InternalRoom,
    phase: GamePhase,
    durationSec: number,
    onExpire: () => void,
  ): void {
    this.clearRoomTimers(room);
    room.phase = phase;
    room.phaseDurationSec = durationSec;
    room.phaseEndsAt = Date.now() + durationSec * 1000;
    room.phaseTimer = setTimeout(onExpire, durationSec * 1000);
    this.broadcastRoom(room);
  }

  private scheduleEarlyAdvance(room: InternalRoom, delayMs: number, next: () => void): void {
    if (room.phaseTimer) {
      clearTimeout(room.phaseTimer);
    }
    room.phaseTimer = setTimeout(next, delayMs);
  }

  private clearRoomTimers(room: InternalRoom): void {
    if (room.phaseTimer) {
      clearTimeout(room.phaseTimer);
      room.phaseTimer = null;
    }
    for (const t of room.botTimers) {
      clearTimeout(t);
    }
    room.botTimers = [];
  }

  // === AI BOT TURN LOGIC ===

  private scheduleBotNightMafia(room: InternalRoom): void {
    const mafiaBots = room.players.filter((p) => p.alive && p.role === 'mafia' && p.isBot);
    if (mafiaBots.length === 0) return;

    const nonMafias = room.players.filter((p) => p.alive && p.role !== 'mafia');
    if (nonMafias.length === 0) return;
    const preferredVictim = nonMafias[Math.floor(Math.random() * nonMafias.length)];

    mafiaBots.forEach((bot, idx) => {
      const delay = 1500 + idx * 550 + Math.floor(Math.random() * 550);
      const timer = setTimeout(() => {
        if (room.phase !== 'NIGHT_MAFIA' || !bot.alive) return;
        // If human mafia partner already chose, align with them!
        const existingChoice = Object.values(room.mafiaSelections)[0];
        const targetId = existingChoice || preferredVictim.id;
        this.submitNightTarget(bot.id, targetId);
      }, delay);
      room.botTimers.push(timer);
    });
  }

  private scheduleBotNightDoctor(room: InternalRoom, doc: InternalPlayer): void {
    const delay = 1500 + Math.floor(Math.random() * 1000);
    const timer = setTimeout(() => {
      if (room.phase !== 'NIGHT_DOCTOR' || !doc.alive) return;
      const candidates = room.players.filter(
        (p) => p.alive && p.id !== room.lastDoctorProtectedId,
      );
      const pool = candidates.length > 0 ? candidates : room.players.filter((p) => p.alive);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick) this.submitNightTarget(doc.id, pick.id);
    }, delay);
    room.botTimers.push(timer);
  }

  private scheduleBotNightDetective(room: InternalRoom, det: InternalPlayer): void {
    const delay = 1500 + Math.floor(Math.random() * 1000);
    const timer = setTimeout(() => {
      if (room.phase !== 'NIGHT_DETECTIVE' || !det.alive) return;
      const candidates = room.players.filter((p) => p.alive && p.id !== det.id);
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      if (pick) this.submitNightTarget(det.id, pick.id);
    }, delay);
    room.botTimers.push(timer);
  }

  private scheduleBotDayVotes(room: InternalRoom): void {
    const bots = room.players.filter((p) => p.alive && p.isBot);
    bots.forEach((bot, idx) => {
      const delay = 1500 + idx * 450 + Math.floor(Math.random() * 900);
      const timer = setTimeout(() => {
        if (room.phase !== 'DAY_VOTE' || !bot.alive) return;
        const candidates = room.players.filter(
          (p) => p.alive && p.id !== bot.id && !p.publiclyCleared && (bot.role !== 'mafia' || p.role !== 'mafia'),
        );
        if (room.settings.skipVoteEnabled && (candidates.length === 0 || Math.random() < 0.25)) {
          this.submitDayVote(bot.id, 'SKIP');
        } else if (candidates.length > 0) {
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          this.submitDayVote(bot.id, pick.id);
        } else if (room.settings.skipVoteEnabled) {
          this.submitDayVote(bot.id, 'SKIP');
        }
      }, delay);
      room.botTimers.push(timer);
    });
  }

  // === PROJECTION (ZERO PRIVATE DATA LEAKS) ===

  private getRoomByPlayer(playerId: string): InternalRoom | undefined {
    const code = this.playerToRoom.get(playerId);
    return code ? this.rooms.get(code) : undefined;
  }

  public buildPlayerView(room: InternalRoom, viewerId: string): RoomViewState {
    const viewer = room.players.find((p) => p.id === viewerId);
    const isGameOver = room.phase === 'GAME_OVER';
    const isViewerMafia = viewer?.role === 'mafia';

    // Public vote tally during DAY_VOTE
    const voteTallies: Record<string, number> = {};
    let skipVotes = 0;
    if (room.phase === 'DAY_VOTE') {
      for (const target of Object.values(room.votes)) {
        if (target === 'SKIP') {
          skipVotes += 1;
        } else {
          voteTallies[target] = (voteTallies[target] ?? 0) + 1;
        }
      }
    }

    const publicPlayers: PlayerPublic[] = room.players.map((p) => {
      let revealedRole: Role | undefined;
      if (isGameOver) {
        revealedRole = p.role ?? undefined;
      } else if (p.id === viewerId) {
        revealedRole = p.role ?? undefined;
      } else if (isViewerMafia && p.role === 'mafia') {
        revealedRole = 'mafia';
      }

      return {
        id: p.id,
        name: p.name,
        seatIndex: p.seatIndex,
        isHost: p.isHost,
        isBot: p.isBot,
        isReady: p.isReady,
        isConnected: p.isConnected,
        alive: p.alive,
        silenced: p.silenced,
        publiclyCleared: p.publiclyCleared,
        appearance: p.appearance,
        revealedRole,
        hasVoted: room.phase === 'DAY_VOTE' ? Boolean(room.votes[p.id]) : false,
      };
    });

    const mafiaPartnerIds = isViewerMafia
      ? room.players
          .filter((p) => p.role === 'mafia' && p.id !== viewerId)
          .map((p) => p.id)
      : [];

    const mafiaSelections = isViewerMafia && room.phase === 'NIGHT_MAFIA'
      ? { ...room.mafiaSelections }
      : {};

    let myNightTargets: string[] = [];
    if (viewer?.role === 'mafia' && room.phase === 'NIGHT_MAFIA') {
      const sel = room.mafiaSelections[viewerId];
      if (sel) myNightTargets = [sel];
    } else if (viewer?.role === 'doctor' && room.phase === 'NIGHT_DOCTOR') {
      myNightTargets = [...room.doctorTargets];
    } else if (viewer?.role === 'detective' && room.phase === 'NIGHT_DETECTIVE') {
      myNightTargets = [...room.detectiveTargets];
    }

    return {
      roomCode: room.roomCode,
      phase: room.phase,
      roundNumber: room.roundNumber,
      phaseEndsAt: room.phaseEndsAt,
      phaseDurationSec: room.phaseDurationSec,
      serverNow: Date.now(),
      settings: { ...room.settings },
      players: publicPlayers,
      voteTallies,
      skipVotes,
      announcements: [...room.announcements],
      publicCardEvent: room.publicCardEvent,
      winner: room.winner,
      me: {
        playerId: viewerId,
        role: viewer?.role ?? null,
        abilityId: viewer?.abilityId ?? null,
        abilityUsed: viewer?.abilityUsed ?? false,
        abilityActiveThisPhase: viewer?.abilityActiveThisPhase ?? false,
        mafiaPartnerIds,
        mafiaSelections,
        myNightTargets,
        lastDoctorProtectedId: viewer?.role === 'doctor' ? room.lastDoctorProtectedId : null,
        myVoteTargetId: room.phase === 'DAY_VOTE' ? (room.votes[viewerId] ?? null) : null,
        privateIntel: viewer ? [...viewer.privateIntel] : [],
        lastCardEvent: viewer?.lastCardEvent ?? null,
      },
    };
  }

  private broadcastRoom(room: InternalRoom): void {
    const map = new Map<string, RoomViewState>();
    for (const p of room.players) {
      if (!p.isBot) {
        map.set(p.id, this.buildPlayerView(room, p.id));
      }
    }
    this.onBroadcast(room.roomCode, map);
  }
}

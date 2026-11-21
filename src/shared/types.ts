export type Language = 'en' | 'ar';
export type Gender = 'male' | 'female';
export type MapId = 'city' | 'office' | 'beach';
export type Role = 'mafia' | 'doctor' | 'detective' | 'civilian';
export type Faction = 'mafia' | 'civilians';

export type GamePhase =
  | 'LOBBY'
  | 'ROLE_REVEAL'
  | 'NIGHT_SLEEP'
  | 'NIGHT_MAFIA'
  | 'NIGHT_DOCTOR'
  | 'NIGHT_DETECTIVE'
  | 'DAY_ANNOUNCE'
  | 'DAY_VOTE'
  | 'GAME_OVER';

export type AbilityId =
  // Mafia (5)
  | 'vote_thief'
  | 'silencer'
  | 'false_trail'
  | 'shadow_swap'
  | 'double_ballot'
  // Doctor (3)
  | 'double_shield'
  | 'emergency_self_revive'
  | 'cleanse_guard'
  // Detective (3)
  | 'true_identity'
  | 'double_investigation'
  | 'suspect_tracker'
  // Civilian (10)
  | 'force_skip'
  | 'shielded_vote'
  | 'double_vote'
  | 'last_will'
  | 'bodyguard'
  | 'public_reveal'
  | 'time_freeze'
  | 'vote_redirect'
  | 'night_watch'
  | 'tiebreaker';

export type AbilityTiming = 'NIGHT_MAFIA' | 'NIGHT_DOCTOR' | 'NIGHT_DETECTIVE' | 'DAY_VOTE' | 'PASSIVE_OR_NIGHT';

export interface AbilityDefinition {
  id: AbilityId;
  role: Role;
  timing: AbilityTiming;
  targetCount: 0 | 1 | 2;
  allowSelfTarget: boolean;
  isPublicAnnouncement: boolean;
  accentHex: string;
}

export interface CharacterAppearance {
  gender: Gender;
  suitId: number; // 0..9
  pantsId: number; // 0..9
  hatId: number | 'none'; // 'none' or 0..9
  hairId: number; // 0..9
  skinColor: string;
  hairColor: string;
}

export interface GameSettings {
  mapId: MapId;
  mafiaCount: 1 | 2;
  minPlayers: 4 | 5;
  mafiaTimeSec: number;
  doctorTimeSec: number;
  detectiveTimeSec: number;
  votingTimeSec: number;
  skipVoteEnabled: boolean;
}

export interface PlayerPublic {
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
  revealedRole?: Role;
  hasVoted?: boolean;
}

export interface PrivateIntelMessage {
  id: string;
  kind: 'detective_result' | 'tracker_result' | 'night_watch' | 'system_notice';
  targetId?: string;
  targetName?: string;
  visitedName?: string;
  isMafia?: boolean;
  exactRole?: Role;
  alertActive?: boolean;
  timestamp: number;
}

export interface CardActivationEvent {
  id: string;
  abilityId: AbilityId;
  casterId: string;
  casterName: string;
  casterRole: Role;
  targetName?: string;
  secondTargetName?: string;
  isPublic: boolean;
  timestamp: number;
}

export interface AnnouncementEvent {
  id: string;
  key:
    | 'night_killed'
    | 'night_saved'
    | 'night_quiet'
    | 'day_eliminated'
    | 'day_tie'
    | 'day_skipped'
    | 'last_will_reveal'
    | 'public_innocent'
    | 'player_silenced'
    | 'time_frozen';
  playerName?: string;
  role?: Role;
  isMafia?: boolean;
  timestamp: number;
}

export interface PlayerPrivateView {
  playerId: string;
  role: Role | null;
  abilityId: AbilityId | null;
  abilityUsed: boolean;
  abilityActiveThisPhase: boolean;
  mafiaPartnerIds: string[];
  mafiaSelections: Record<string, string>; // mafiaId -> targetId
  myNightTargets: string[];
  lastDoctorProtectedId: string | null;
  myVoteTargetId: string | null; // playerId or 'SKIP'
  privateIntel: PrivateIntelMessage[];
  lastCardEvent: CardActivationEvent | null;
}

export interface RoomViewState {
  roomCode: string;
  phase: GamePhase;
  roundNumber: number;
  phaseEndsAt: number;
  phaseDurationSec: number;
  serverNow: number;
  settings: GameSettings;
  players: PlayerPublic[];
  voteTallies: Record<string, number>; // targetId or 'SKIP' -> count
  skipVotes: number;
  announcements: AnnouncementEvent[];
  publicCardEvent: CardActivationEvent | null;
  winner: Faction | null;
  me: PlayerPrivateView;
}

export interface ValidationErrorPayload {
  code:
    | 'NAME_REQUIRED'
    | 'NAME_TOO_SHORT'
    | 'NAME_TOO_LONG'
    | 'NAME_INVALID'
    | 'ROOM_NOT_FOUND'
    | 'INVALID_ROOM_CODE'
    | 'SERVER_UNREACHABLE'
    | 'ROOM_FULL'
    | 'GAME_ALREADY_STARTED'
    | 'MIN_PLAYERS_REQUIRED'
    | 'NOT_ALL_READY'
    | 'NOT_HOST'
    | 'INVALID_ACTION'
    | 'CONSECUTIVE_PROTECT_BLOCKED'
    | 'SILENCED_BLOCKED';
}

export interface ActionResponse<T = undefined> {
  ok: boolean;
  error?: ValidationErrorPayload['code'];
  data?: T;
}

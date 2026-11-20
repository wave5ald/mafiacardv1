import { ABILITY_POOLS } from '../shared/abilities';
import {
  AbilityId,
  Faction,
  GameSettings,
  Role,
  ValidationErrorPayload,
} from '../shared/types';

export const MIN_PLAYERS_HARD = 4;
export const MAX_PLAYERS = 10;

// Supports Arabic script (\u0600-\u06FF), Latin letters, digits, spaces, underscores, hyphens
const VALID_NAME_REGEX = /^[\p{L}\p{N} _-]+$/u;

export function validatePlayerName(raw: unknown): {
  valid: boolean;
  trimmed: string;
  error?: ValidationErrorPayload['code'];
} {
  if (typeof raw !== 'string') {
    return { valid: false, trimmed: '', error: 'NAME_REQUIRED' };
  }
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0) {
    return { valid: false, trimmed: '', error: 'NAME_REQUIRED' };
  }
  if (trimmed.length < 2) {
    return { valid: false, trimmed, error: 'NAME_TOO_SHORT' };
  }
  if (trimmed.length > 16) {
    return { valid: false, trimmed, error: 'NAME_TOO_LONG' };
  }
  if (!VALID_NAME_REGEX.test(trimmed)) {
    return { valid: false, trimmed, error: 'NAME_INVALID' };
  }
  return { valid: true, trimmed };
}

export function enforceMafiaCount(playerCount: number, requested: number): 1 | 2 {
  if (playerCount <= 6) {
    return 1;
  }
  return requested === 2 ? 2 : 1;
}

export function sanitizeGameSettings(
  current: GameSettings,
  patch: Partial<GameSettings>,
  playerCount: number,
): GameSettings {
  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, Math.round(val)));
  const next: GameSettings = {
    mapId: patch.mapId ?? current.mapId,
    mafiaCount: enforceMafiaCount(playerCount, patch.mafiaCount ?? current.mafiaCount),
    minPlayers: patch.minPlayers === 5 ? 5 : patch.minPlayers === 4 ? 4 : current.minPlayers,
    mafiaTimeSec: clamp(patch.mafiaTimeSec ?? current.mafiaTimeSec, 15, 60),
    doctorTimeSec: clamp(patch.doctorTimeSec ?? current.doctorTimeSec, 15, 60),
    detectiveTimeSec: clamp(patch.detectiveTimeSec ?? current.detectiveTimeSec, 15, 60),
    votingTimeSec: clamp(patch.votingTimeSec ?? current.votingTimeSec, 20, 90),
    skipVoteEnabled:
      typeof patch.skipVoteEnabled === 'boolean' ? patch.skipVoteEnabled : current.skipVoteEnabled,
  };
  return next;
}

export function shuffleArray<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export interface RoleAndCardAssignment {
  roles: Record<string, Role>;
  abilities: Record<string, AbilityId | null>;
}

/**
 * Distributes roles and deals once-per-game ability cards following exact pool rules:
 * - Mafia count locked to 1 if players <= 6, else 1 or 2.
 * - 1 Doctor, 1 Detective, remaining Civilians.
 * - Mafia pool (5): 1-Mafia gets 1 card; 2-Mafia each gets 1 distinct card (2 distinct total).
 * - Doctor pool (3): 1 random card.
 * - Detective pool (3): 1 random card.
 * - Civilian pool (10): up to 6 unique cards dealt 1 per Civilian (random 6 Civilians if > 6).
 */
export function assignRolesAndCards(
  playerIds: string[],
  requestedMafiaCount: 1 | 2,
  rng: () => number = Math.random,
): RoleAndCardAssignment {
  const mafiaCount = enforceMafiaCount(playerIds.length, requestedMafiaCount);
  const shuffledIds = shuffleArray(playerIds, rng);

  const roles: Record<string, Role> = {};
  const mafiaIds: string[] = [];
  let doctorId: string | null = null;
  let detectiveId: string | null = null;
  const civilianIds: string[] = [];

  shuffledIds.forEach((id, idx) => {
    if (idx < mafiaCount) {
      roles[id] = 'mafia';
      mafiaIds.push(id);
    } else if (idx === mafiaCount) {
      roles[id] = 'doctor';
      doctorId = id;
    } else if (idx === mafiaCount + 1) {
      roles[id] = 'detective';
      detectiveId = id;
    } else {
      roles[id] = 'civilian';
      civilianIds.push(id);
    }
  });

  const abilities: Record<string, AbilityId | null> = {};
  for (const id of playerIds) {
    abilities[id] = null;
  }

  // Mafia cards: distinct cards from 5-card pool
  const mafiaPool = shuffleArray(ABILITY_POOLS.mafia, rng);
  mafiaIds.forEach((id, idx) => {
    abilities[id] = mafiaPool[idx] ?? null;
  });

  // Doctor card
  if (doctorId) {
    const docPool = shuffleArray(ABILITY_POOLS.doctor, rng);
    abilities[doctorId] = docPool[0];
  }

  // Detective card
  if (detectiveId) {
    const detPool = shuffleArray(ABILITY_POOLS.detective, rng);
    abilities[detectiveId] = detPool[0];
  }

  // Civilian cards: up to 6 unique cards from 10-card pool
  const civPool = shuffleArray(ABILITY_POOLS.civilian, rng);
  const civRecipients = shuffleArray(civilianIds, rng).slice(0, Math.min(6, civilianIds.length));
  civRecipients.forEach((id, idx) => {
    abilities[id] = civPool[idx] ?? null;
  });

  return { roles, abilities };
}

export interface NightActionInput {
  mafiaSelections: Record<string, string>; // mafiaId -> targetId
  doctorId: string | null;
  doctorProtectedIds: string[];
  doctorCleanseTargetId: string | null;
  doctorSelfReviveArmed: boolean;
  bodyguardTargetId: string | null;
  shadowSwapTargetId: string | null;
  silencerTargetId: string | null;
  falseTrailTargetId: string | null;
  rng?: () => number;
}

export interface NightResolutionResult {
  chosenMafiaTargetId: string | null;
  eliminatedId: string | null;
  saved: boolean;
  selfReviveConsumed: boolean;
  bodyguardConsumed: boolean;
  silencedId: string | null;
  framedId: string | null;
}

export function resolveNightPhase(input: NightActionInput): NightResolutionResult {
  const rng = input.rng ?? Math.random;
  const targets = Object.values(input.mafiaSelections).filter(Boolean);

  // If 2 Mafias split targets, randomly pick between their selections
  let chosenMafiaTargetId: string | null = null;
  if (targets.length === 1) {
    chosenMafiaTargetId = targets[0];
  } else if (targets.length >= 2) {
    if (targets[0] === targets[1]) {
      chosenMafiaTargetId = targets[0];
    } else {
      chosenMafiaTargetId = targets[Math.floor(rng() * targets.length)];
    }
  }

  // Cleanse Guard cancels any Mafia ability (Shadow Swap, Silencer, False Trail) targeting that cleansed player
  const cleansedId = input.doctorCleanseTargetId;
  const effectiveShadowSwap =
    input.shadowSwapTargetId && input.shadowSwapTargetId !== cleansedId
      ? input.shadowSwapTargetId
      : null;
  const effectiveSilenced =
    input.silencerTargetId && input.silencerTargetId !== cleansedId ? input.silencerTargetId : null;
  const effectiveFramed =
    input.falseTrailTargetId && input.falseTrailTargetId !== cleansedId
      ? input.falseTrailTargetId
      : null;

  let eliminatedId: string | null = null;
  let saved = false;
  let selfReviveConsumed = false;
  let bodyguardConsumed = false;

  if (chosenMafiaTargetId) {
    const isDoctorProtected =
      input.doctorProtectedIds.includes(chosenMafiaTargetId) ||
      cleansedId === chosenMafiaTargetId;
    const protectionBroken = effectiveShadowSwap === chosenMafiaTargetId;

    if (isDoctorProtected && !protectionBroken) {
      saved = true;
    } else if (input.bodyguardTargetId === chosenMafiaTargetId) {
      saved = true;
      bodyguardConsumed = true;
    } else if (
      input.doctorId &&
      chosenMafiaTargetId === input.doctorId &&
      input.doctorSelfReviveArmed
    ) {
      saved = true;
      selfReviveConsumed = true;
    } else {
      eliminatedId = chosenMafiaTargetId;
    }
  }

  return {
    chosenMafiaTargetId,
    eliminatedId,
    saved,
    selfReviveConsumed,
    bodyguardConsumed,
    silencedId: effectiveSilenced,
    framedId: effectiveFramed,
  };
}

export interface DayVoteInput {
  alivePlayerIds: string[];
  rawVotes: Record<string, string>; // voterId -> targetId | 'SKIP'
  doubleVoters: string[]; // double_ballot or double_vote casters
  voteThief?: { victimId: string; forcedTargetId: string } | null;
  forceSkipVictimId?: string | null;
  shieldedPlayerIds: string[];
  voteRedirects: Record<string, string>; // shieldedOwnerId -> redirectTargetId
  tiebreakerVoterId?: string | null;
}

export interface DayVoteResult {
  tallies: Record<string, number>;
  skipVotes: number;
  eliminatedId: string | null;
  outcome: 'eliminated' | 'tie' | 'skipped';
}

export function resolveDayVotes(input: DayVoteInput): DayVoteResult {
  const tallies: Record<string, number> = {};
  let skipVotes = 0;

  const effectiveVotes: Record<string, string> = {};
  const aliveSet = new Set(input.alivePlayerIds);

  for (const voterId of input.alivePlayerIds) {
    let target = input.rawVotes[voterId];
    if (!target) continue;

    // Force Skip overrides player's vote to SKIP
    if (input.forceSkipVictimId === voterId) {
      target = 'SKIP';
    }

    // Vote Thief overrides victim's vote to Mafia's chosen target
    if (input.voteThief && input.voteThief.victimId === voterId) {
      if (aliveSet.has(input.voteThief.forcedTargetId)) {
        target = input.voteThief.forcedTargetId;
      }
    }

    // Vote Redirect bounces votes cast against redirectOwner onto another player
    if (target !== 'SKIP' && input.voteRedirects[target] && aliveSet.has(input.voteRedirects[target])) {
      target = input.voteRedirects[target];
    }

    // Shielded Vote makes target immune from receiving votes
    if (target !== 'SKIP' && input.shieldedPlayerIds.includes(target)) {
      continue;
    }

    effectiveVotes[voterId] = target;
    const weight = input.doubleVoters.includes(voterId) ? 2 : 1;
    if (target === 'SKIP') {
      skipVotes += weight;
    } else if (aliveSet.has(target)) {
      tallies[target] = (tallies[target] ?? 0) + weight;
    }
  }

  let maxPlayerVotes = 0;
  let leaders: string[] = [];
  for (const [targetId, count] of Object.entries(tallies)) {
    if (count > maxPlayerVotes) {
      maxPlayerVotes = count;
      leaders = [targetId];
    } else if (count === maxPlayerVotes && count > 0) {
      leaders.push(targetId);
    }
  }

  // No votes at all or Skip strictly beats or ties the top candidate?
  // Spec: "Highest votes = eliminated; ties or Skip majority = no elimination."
  if (maxPlayerVotes === 0 || skipVotes >= maxPlayerVotes) {
    if (skipVotes > 0 && skipVotes >= maxPlayerVotes) {
      return { tallies, skipVotes, eliminatedId: null, outcome: 'skipped' };
    }
    return { tallies, skipVotes, eliminatedId: null, outcome: 'tie' };
  }

  if (leaders.length === 1) {
    return { tallies, skipVotes, eliminatedId: leaders[0], outcome: 'eliminated' };
  }

  // Tie between multiple players: check Tiebreaker card
  if (input.tiebreakerVoterId) {
    const tbVote = effectiveVotes[input.tiebreakerVoterId];
    if (tbVote && leaders.includes(tbVote)) {
      return { tallies, skipVotes, eliminatedId: tbVote, outcome: 'eliminated' };
    }
  }

  return { tallies, skipVotes, eliminatedId: null, outcome: 'tie' };
}

export function checkWinner(players: Array<{ alive: boolean; role: Role | null }>): Faction | null {
  const living = players.filter((p) => p.alive);
  const livingMafia = living.filter((p) => p.role === 'mafia').length;
  const livingNonMafia = living.length - livingMafia;

  if (livingMafia === 0) {
    return 'civilians';
  }
  if (livingMafia >= livingNonMafia) {
    return 'mafia';
  }
  return null;
}

export function getSeatNeighbors(
  players: Array<{ id: string; seatIndex: number }>,
  targetId: string,
): string[] {
  const sorted = [...players].sort((a, b) => a.seatIndex - b.seatIndex);
  const idx = sorted.findIndex((p) => p.id === targetId);
  if (idx === -1 || sorted.length < 2) return [];
  const prev = sorted[(idx - 1 + sorted.length) % sorted.length];
  const next = sorted[(idx + 1) % sorted.length];
  return prev.id === next.id ? [prev.id] : [prev.id, next.id];
}

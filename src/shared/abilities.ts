import { AbilityDefinition, AbilityId, Role } from './types';

export const ABILITIES: Record<AbilityId, AbilityDefinition> = {
  // === MAFIA ABILITY POOL (5) ===
  vote_thief: {
    id: 'vote_thief',
    role: 'mafia',
    timing: 'DAY_VOTE',
    targetCount: 2, // target 1 = victim whose vote is stolen, target 2 = candidate they are forced to vote for
    allowSelfTarget: false,
    isPublicAnnouncement: false,
    accentHex: '#FF3B5C',
  },
  silencer: {
    id: 'silencer',
    role: 'mafia',
    timing: 'NIGHT_MAFIA',
    targetCount: 1,
    allowSelfTarget: false,
    isPublicAnnouncement: false,
    accentHex: '#FF3B5C',
  },
  false_trail: {
    id: 'false_trail',
    role: 'mafia',
    timing: 'NIGHT_MAFIA',
    targetCount: 1,
    allowSelfTarget: false,
    isPublicAnnouncement: false,
    accentHex: '#FF3B5C',
  },
  shadow_swap: {
    id: 'shadow_swap',
    role: 'mafia',
    timing: 'NIGHT_MAFIA',
    targetCount: 1,
    allowSelfTarget: false,
    isPublicAnnouncement: false,
    accentHex: '#FF3B5C',
  },
  double_ballot: {
    id: 'double_ballot',
    role: 'mafia',
    timing: 'DAY_VOTE',
    targetCount: 0,
    allowSelfTarget: true,
    isPublicAnnouncement: false,
    accentHex: '#FF3B5C',
  },

  // === DOCTOR ABILITY POOL (3) ===
  double_shield: {
    id: 'double_shield',
    role: 'doctor',
    timing: 'NIGHT_DOCTOR',
    targetCount: 0, // unlocks selecting 2 targets during NIGHT_DOCTOR
    allowSelfTarget: true,
    isPublicAnnouncement: false,
    accentHex: '#22E58B',
  },
  emergency_self_revive: {
    id: 'emergency_self_revive',
    role: 'doctor',
    timing: 'PASSIVE_OR_NIGHT',
    targetCount: 0,
    allowSelfTarget: true,
    isPublicAnnouncement: false,
    accentHex: '#22E58B',
  },
  cleanse_guard: {
    id: 'cleanse_guard',
    role: 'doctor',
    timing: 'NIGHT_DOCTOR',
    targetCount: 1,
    allowSelfTarget: true,
    isPublicAnnouncement: false,
    accentHex: '#22E58B',
  },

  // === DETECTIVE ABILITY POOL (3) ===
  true_identity: {
    id: 'true_identity',
    role: 'detective',
    timing: 'NIGHT_DETECTIVE',
    targetCount: 0, // enhances the detective inspection this night to exact role
    allowSelfTarget: false,
    isPublicAnnouncement: false,
    accentHex: '#38B6FF',
  },
  double_investigation: {
    id: 'double_investigation',
    role: 'detective',
    timing: 'NIGHT_DETECTIVE',
    targetCount: 0, // unlocks inspecting 2 targets this night
    allowSelfTarget: false,
    isPublicAnnouncement: false,
    accentHex: '#38B6FF',
  },
  suspect_tracker: {
    id: 'suspect_tracker',
    role: 'detective',
    timing: 'NIGHT_DETECTIVE',
    targetCount: 1,
    allowSelfTarget: false,
    isPublicAnnouncement: false,
    accentHex: '#38B6FF',
  },

  // === CIVILIAN ABILITY POOL (10) ===
  force_skip: {
    id: 'force_skip',
    role: 'civilian',
    timing: 'DAY_VOTE',
    targetCount: 1,
    allowSelfTarget: false,
    isPublicAnnouncement: true,
    accentHex: '#A855F7',
  },
  shielded_vote: {
    id: 'shielded_vote',
    role: 'civilian',
    timing: 'DAY_VOTE',
    targetCount: 0,
    allowSelfTarget: true,
    isPublicAnnouncement: true,
    accentHex: '#A855F7',
  },
  double_vote: {
    id: 'double_vote',
    role: 'civilian',
    timing: 'DAY_VOTE',
    targetCount: 0,
    allowSelfTarget: true,
    isPublicAnnouncement: true,
    accentHex: '#A855F7',
  },
  last_will: {
    id: 'last_will',
    role: 'civilian',
    timing: 'DAY_VOTE',
    targetCount: 1, // choose player to reveal if you are eliminated
    allowSelfTarget: false,
    isPublicAnnouncement: false,
    accentHex: '#A855F7',
  },
  bodyguard: {
    id: 'bodyguard',
    role: 'civilian',
    timing: 'DAY_VOTE',
    targetCount: 1,
    allowSelfTarget: false,
    isPublicAnnouncement: false,
    accentHex: '#A855F7',
  },
  public_reveal: {
    id: 'public_reveal',
    role: 'civilian',
    timing: 'DAY_VOTE',
    targetCount: 0,
    allowSelfTarget: false,
    isPublicAnnouncement: true,
    accentHex: '#A855F7',
  },
  time_freeze: {
    id: 'time_freeze',
    role: 'civilian',
    timing: 'DAY_VOTE',
    targetCount: 0,
    allowSelfTarget: true,
    isPublicAnnouncement: true,
    accentHex: '#A855F7',
  },
  vote_redirect: {
    id: 'vote_redirect',
    role: 'civilian',
    timing: 'DAY_VOTE',
    targetCount: 1,
    allowSelfTarget: false,
    isPublicAnnouncement: false,
    accentHex: '#A855F7',
  },
  night_watch: {
    id: 'night_watch',
    role: 'civilian',
    timing: 'DAY_VOTE',
    targetCount: 0,
    allowSelfTarget: true,
    isPublicAnnouncement: false,
    accentHex: '#A855F7',
  },
  tiebreaker: {
    id: 'tiebreaker',
    role: 'civilian',
    timing: 'DAY_VOTE',
    targetCount: 0,
    allowSelfTarget: true,
    isPublicAnnouncement: true,
    accentHex: '#A855F7',
  },
};

export const ABILITY_POOLS: Record<Role, AbilityId[]> = {
  mafia: ['vote_thief', 'silencer', 'false_trail', 'shadow_swap', 'double_ballot'],
  doctor: ['double_shield', 'emergency_self_revive', 'cleanse_guard'],
  detective: ['true_identity', 'double_investigation', 'suspect_tracker'],
  civilian: [
    'force_skip',
    'shielded_vote',
    'double_vote',
    'last_will',
    'bodyguard',
    'public_reveal',
    'time_freeze',
    'vote_redirect',
    'night_watch',
    'tiebreaker',
  ],
};

export const ALL_ABILITY_IDS: AbilityId[] = [
  ...ABILITY_POOLS.mafia,
  ...ABILITY_POOLS.doctor,
  ...ABILITY_POOLS.detective,
  ...ABILITY_POOLS.civilian,
];

export const ROLE_COLORS: Record<Role, { hex: string; softBg: string; border: string; text: string }> = {
  mafia: {
    hex: '#FF3B5C',
    softBg: 'rgba(255, 59, 92, 0.18)',
    border: 'rgba(255, 59, 92, 0.65)',
    text: '#FF6B84',
  },
  doctor: {
    hex: '#22E58B',
    softBg: 'rgba(34, 229, 139, 0.16)',
    border: 'rgba(34, 229, 139, 0.65)',
    text: '#4DF2A6',
  },
  detective: {
    hex: '#38B6FF',
    softBg: 'rgba(56, 182, 255, 0.16)',
    border: 'rgba(56, 182, 255, 0.65)',
    text: '#72CDFF',
  },
  civilian: {
    hex: '#A855F7',
    softBg: 'rgba(168, 85, 247, 0.18)',
    border: 'rgba(168, 85, 247, 0.65)',
    text: '#C88BFF',
  },
};

import { CharacterAppearance, Gender, MapId } from './types';

export interface WardrobeItemStyle {
  id: number;
  primary: string;
  secondary: string;
  accent: string;
  variant: string;
}

export const SKIN_COLORS: string[] = [
  '#FFE0C8',
  '#F5C49E',
  '#E0A47A',
  '#C68658',
  '#9A5E3B',
  '#6E3E26',
  '#4A2918',
  '#F9D5B8',
];

export const HAIR_COLORS: string[] = [
  '#1C1924',
  '#4A2E1B',
  '#8C4A22',
  '#D49E3C',
  '#A82A36',
  '#3A4A7A',
  '#9A4DB8',
  '#E4E2EB',
];

/**
 * 10 Distinct 3D Suit Geometries per gender (each variant maps to a dedicated 3D mesh builder).
 */
export const SUIT_CATALOG: Record<Gender, WardrobeItemStyle[]> = {
  male: [
    { id: 0, primary: '#1E2136', secondary: '#F8F7FF', accent: '#E53955', variant: 'tuxedo' },
    { id: 1, primary: '#A6835B', secondary: '#F5EFE6', accent: '#543A22', variant: 'trench' },
    { id: 2, primary: '#25263B', secondary: '#EAE8F5', accent: '#E11D48', variant: 'pinstripe' },
    { id: 3, primary: '#4F2AB8', secondary: '#F8FAFC', accent: '#22E58B', variant: 'hoodie' },
    { id: 4, primary: '#1A1A22', secondary: '#E2E8F0', accent: '#CBD5E1', variant: 'biker' },
    { id: 5, primary: '#17346B', secondary: '#F8FAFF', accent: '#FACC15', variant: 'admiral' },
    { id: 6, primary: '#4B365E', secondary: '#F8F5FC', accent: '#F59E0B', variant: 'vest' },
    { id: 7, primary: '#0F6B7A', secondary: '#1B2436', accent: '#FACC15', variant: 'puffer' },
    { id: 8, primary: '#7F1D3A', secondary: '#FFF1F2', accent: '#F59E0B', variant: 'velvet' },
    { id: 9, primary: '#B91C3C', secondary: '#F5F1E6', accent: '#FACC15', variant: 'varsity' },
  ],
  female: [
    { id: 0, primary: '#231B3E', secondary: '#FFF5F8', accent: '#FF3B5C', variant: 'tuxedo' },
    { id: 1, primary: '#B58E63', secondary: '#FBF5EC', accent: '#5C3D24', variant: 'trench' },
    { id: 2, primary: '#2A2542', secondary: '#F1ECFA', accent: '#FF3B5C', variant: 'pinstripe' },
    { id: 3, primary: '#6D28D9', secondary: '#FDF4FF', accent: '#38B6FF', variant: 'hoodie' },
    { id: 4, primary: '#1C1B24', secondary: '#F43F5E', accent: '#E2E8F0', variant: 'biker' },
    { id: 5, primary: '#1B3E78', secondary: '#FFFFFF', accent: '#FACC15', variant: 'admiral' },
    { id: 6, primary: '#5B3B73', secondary: '#FFF9F0', accent: '#F59E0B', variant: 'vest' },
    { id: 7, primary: '#0EA5A4', secondary: '#1E293B', accent: '#FDE047', variant: 'puffer' },
    { id: 8, primary: '#9D174D', secondary: '#FFE4E6', accent: '#FACC15', variant: 'velvet' },
    { id: 9, primary: '#2563EB', secondary: '#F8F5EC', accent: '#FACC15', variant: 'varsity' },
  ],
};

/**
 * 10 Distinct 3D Lower-Body & Shoe Geometries per gender.
 */
export const PANTS_CATALOG: Record<Gender, WardrobeItemStyle[]> = {
  male: [
    { id: 0, primary: '#1B1E30', secondary: '#2D324D', accent: '#FACC15', variant: 'slacks' },
    { id: 1, primary: '#222438', secondary: '#45486B', accent: '#E2E8F0', variant: 'pinstripe' },
    { id: 2, primary: '#49583E', secondary: '#34402C', accent: '#D97706', variant: 'cargo' },
    { id: 3, primary: '#2E568F', secondary: '#93C5FD', accent: '#F59E0B', variant: 'jeans' },
    { id: 4, primary: '#252A38', secondary: '#475569', accent: '#22E58B', variant: 'joggers' },
    { id: 5, primary: '#5C2C38', secondary: '#D4A373', accent: '#FACC15', variant: 'plaid' },
    { id: 6, primary: '#7A634C', secondary: '#594634', accent: '#1F2937', variant: 'shorts' },
    { id: 7, primary: '#D8D3E6', secondary: '#B6AECB', accent: '#78350F', variant: 'wide_belted' },
    { id: 8, primary: '#37304A', secondary: '#52476E', accent: '#D97706', variant: 'suspenders' },
    { id: 9, primary: '#141224', secondary: '#2A2547', accent: '#FACC15', variant: 'gala' },
  ],
  female: [
    { id: 0, primary: '#20183B', secondary: '#352861', accent: '#FF3B5C', variant: 'pleated_midi' },
    { id: 1, primary: '#282340', secondary: '#494073', accent: '#38B6FF', variant: 'pinstripe_mini' },
    { id: 2, primary: '#EAE4F7', secondary: '#CFC5E8', accent: '#A855F7', variant: 'culottes' },
    { id: 3, primary: '#3560A1', secondary: '#93C5FD', accent: '#F59E0B', variant: 'jeans' },
    { id: 4, primary: '#272C3D', secondary: '#475569', accent: '#22E58B', variant: 'joggers' },
    { id: 5, primary: '#8A1C42', secondary: '#B8295A', accent: '#FACC15', variant: 'ruffled_skirt' },
    { id: 6, primary: '#1E3A7A', secondary: '#3B82F6', accent: '#FDE047', variant: 'flared_mini' },
    { id: 7, primary: '#8C6B54', secondary: '#694D3A', accent: '#FACC15', variant: 'wide_belted' },
    { id: 8, primary: '#493166', secondary: '#67468F', accent: '#EC4899', variant: 'suspenders_skirt' },
    { id: 9, primary: '#17112B', secondary: '#2F2357', accent: '#FACC15', variant: 'gala_ruffled' },
  ],
};

export const HAT_CATALOG: WardrobeItemStyle[] = [
  { id: 0, primary: '#1C1A29', secondary: '#FF3B5C', accent: '#FACC15', variant: 'fedora' },
  { id: 1, primary: '#292638', secondary: '#A855F7', accent: '#E2E8F0', variant: 'bowler' },
  { id: 2, primary: '#151321', secondary: '#FACC15', accent: '#FF3B5C', variant: 'top_hat' },
  { id: 3, primary: '#A82443', secondary: '#4D1120', accent: '#FDE68A', variant: 'beret' },
  { id: 4, primary: '#2563EB', secondary: '#F8FAFC', accent: '#FACC15', variant: 'cap' },
  { id: 5, primary: '#7C3AED', secondary: '#C4B5FD', accent: '#F59E0B', variant: 'beanie' },
  { id: 6, primary: '#7D6347', secondary: '#4F3C28', accent: '#22E58B', variant: 'deerstalker' },
  { id: 7, primary: '#8C522E', secondary: '#D97706', accent: '#FDE68A', variant: 'cowboy' },
  { id: 8, primary: '#FACC15', secondary: '#F59E0B', accent: '#FF3B5C', variant: 'crown' },
  { id: 9, primary: '#E8C882', secondary: '#FF3B5C', accent: '#38B6FF', variant: 'sun_hat' },
];

export const HAIR_CATALOG: Record<Gender, WardrobeItemStyle[]> = {
  male: [
    { id: 0, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'side_part' },
    { id: 1, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'spiky' },
    { id: 2, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'pompadour' },
    { id: 3, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'curly_top' },
    { id: 4, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'buzz' },
    { id: 5, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'messy' },
    { id: 6, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'slick_back' },
    { id: 7, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'undercut' },
    { id: 8, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'afro' },
    { id: 9, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'long_layered' },
  ],
  female: [
    { id: 0, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'long_wavy' },
    { id: 1, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'ponytail' },
    { id: 2, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'twin_buns' },
    { id: 3, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'bob_cut' },
    { id: 4, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'side_braid' },
    { id: 5, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'curly_volume' },
    { id: 6, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'pigtails' },
    { id: 7, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'layered_shoulder' },
    { id: 8, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'pixie' },
    { id: 9, primary: '#1C1924', secondary: '#2D283A', accent: '#48405C', variant: 'half_up_bow' },
  ],
};

export interface MapThemeInfo {
  id: MapId;
  skyHex: string;
  fogHex: string;
  accentHex: string;
  cardGradient: string;
}

export const MAP_THEMES: Record<MapId, MapThemeInfo> = {
  city: {
    id: 'city',
    skyHex: '#181134',
    fogHex: '#1D143D',
    accentHex: '#FACC15',
    cardGradient: 'linear-gradient(135deg, #271954 0%, #42267A 55%, #160F33 100%)',
  },
  office: {
    id: 'office',
    skyHex: '#1A1328',
    fogHex: '#231730',
    accentHex: '#F59E0B',
    cardGradient: 'linear-gradient(135deg, #3D231A 0%, #5C3424 55%, #1D1214 100%)',
  },
  beach: {
    id: 'beach',
    skyHex: '#251845',
    fogHex: '#2E1E4F',
    accentHex: '#38B6FF',
    cardGradient: 'linear-gradient(135deg, #1E3A5F 0%, #5B2D6E 55%, #C96B4B 100%)',
  },
};

export function getDefaultAppearanceForGender(
  gender: Gender,
  keepColors?: { skinColor?: string; hairColor?: string },
): CharacterAppearance {
  return {
    gender,
    suitId: 0,
    pantsId: 0,
    hatId: 'none',
    hairId: 0,
    skinColor: keepColors?.skinColor ?? SKIN_COLORS[1],
    hairColor: keepColors?.hairColor ?? HAIR_COLORS[1],
  };
}

export const DEFAULT_APPEARANCE: CharacterAppearance = getDefaultAppearanceForGender('male');

export function createRandomAppearance(seedIndex?: number): CharacterAppearance {
  const rand = (max: number, offset = 0) =>
    seedIndex !== undefined
      ? Math.abs((seedIndex * 37 + offset * 17 + 13) % max)
      : Math.floor(Math.random() * max);
  const gender: Gender = rand(2, 1) === 0 ? 'male' : 'female';
  const wearHat = rand(10, 4) >= 4; // ~40% show full hair with No Hat, ~60% wear a hat
  return {
    gender,
    suitId: rand(10, 2),
    pantsId: rand(10, 3),
    hatId: wearHat ? rand(10, 8) : 'none',
    hairId: rand(10, 5),
    skinColor: SKIN_COLORS[rand(SKIN_COLORS.length, 6)],
    hairColor: HAIR_COLORS[rand(HAIR_COLORS.length, 7)],
  };
}

export const BOT_NAMES_EN = [
  'Don Luca',
  'Sora',
  'Vito',
  'Nadia',
  'Marco',
  'Layla',
  'Rami',
  'Cleo',
  'Tariq',
  'Elena',
];

export const BOT_NAMES_AR = [
  'طارق',
  'ليلى',
  'رامي',
  'نادية',
  'كريم',
  'سارة',
  'عمر',
  'دانا',
  'فيصل',
  'مريم',
];

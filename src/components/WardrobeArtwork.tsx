import {
  HAIR_CATALOG,
  HAT_CATALOG,
  PANTS_CATALOG,
  SUIT_CATALOG,
} from '../shared/catalog';
import { CharacterAppearance, Gender, MapId } from '../shared/types';

function shadeHex(hex: string, factor: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(0, 2), 16) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(2, 4), 16) * factor)));
  const b = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(4, 6), 16) * factor)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function SuitThumbSvg({
  gender,
  suitId,
  className = 'w-14 h-14',
}: {
  gender: Gender;
  suitId: number;
  className?: string;
}) {
  const item = SUIT_CATALOG[gender][suitId % 10];
  const dark = shadeHex(item.primary, 0.72);
  const light = shadeHex(item.primary, 1.24);
  const v = item.variant;
  const isFemale = gender === 'female';

  return (
    <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
      <ellipse cx="40" cy="74" rx="22" ry="3.8" fill="#0A061C" opacity="0.45" />

      {/* 1. STREET HOODIE */}
      {v === 'hoodie' && (
        <g>
          {/* Back hood behind collar */}
          <path
            d="M25 22C25 11 55 11 55 22L50 28H30L25 22Z"
            fill={dark}
            stroke="#0F0A24"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Sleeves */}
          <path d="M22 22L10 53L20 57L27 34Z" fill={dark} stroke="#0F0A24" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M58 22L70 53L60 57L53 34Z" fill={dark} stroke="#0F0A24" strokeWidth="2.2" strokeLinejoin="round" />
          <rect x="10.5" y="52" width="10" height="5" rx="2" fill={item.accent} stroke="#0F0A24" strokeWidth="1.5" />
          <rect x="59.5" y="52" width="10" height="5" rx="2" fill={item.accent} stroke="#0F0A24" strokeWidth="1.5" />
          {/* Relaxed Hoodie Body */}
          <path
            d="M22 21C29 18 51 18 58 21L60 66C48 69 32 69 20 66L22 21Z"
            fill={item.primary}
            stroke="#0F0A24"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {/* Ribbed hem */}
          <rect x="21" y="61" width="38" height="6" rx="2.5" fill={dark} stroke="#0F0A24" strokeWidth="1.6" />
          {/* Drawstrings */}
          <path d="M35 23V37" stroke={item.secondary} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M45 23V37" stroke={item.secondary} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="35" cy="38" r="1.8" fill={item.accent} />
          <circle cx="45" cy="38" r="1.8" fill={item.accent} />
          {/* Kangaroo Pocket */}
          <path
            d="M28 45H52L55 58H25L28 45Z"
            fill={light}
            stroke="#0F0A24"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Chest Stripe */}
          <rect x="23" y="39" width="34" height="3.5" rx="1.5" fill={item.accent} opacity="0.9" />
        </g>
      )}

      {/* 2. DETECTIVE TRENCH COAT */}
      {v === 'trench' && (
        <g>
          <path d="M21 20L10 53L19 56L26 32Z" fill={dark} stroke="#0F0A24" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M59 20L70 53L61 56L54 32Z" fill={dark} stroke="#0F0A24" strokeWidth="2.2" strokeLinejoin="round" />
          {/* Long Knee-Length Flared Trench */}
          <path
            d="M22 18C29 15 51 15 58 18L63 71C48 74 32 74 17 71L22 18Z"
            fill={item.primary}
            stroke="#0F0A24"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {/* Popped Collar & Storm Capelet */}
          <path d="M28 14L40 20L52 14L50 22H30L28 14Z" fill={dark} stroke="#0F0A24" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M22 20H58L55 32C46 35 34 35 25 32L22 20Z" fill={light} stroke="#0F0A24" strokeWidth="1.7" strokeLinejoin="round" />
          {/* Shirt V */}
          <path d="M33 17H47L40 33L33 17Z" fill={item.secondary} stroke="#0F0A24" strokeWidth="1.4" />
          {/* Double-breasted buttons */}
          <circle cx="34" cy="38" r="1.8" fill={item.accent} />
          <circle cx="46" cy="38" r="1.8" fill={item.accent} />
          <circle cx="34" cy="56" r="1.8" fill={item.accent} />
          <circle cx="46" cy="56" r="1.8" fill={item.accent} />
          {/* Waist Belt + Gold Buckle */}
          <rect x="20" y="44" width="40" height="5.5" rx="1.6" fill={item.accent} stroke="#0F0A24" strokeWidth="1.6" />
          <rect x="36.5" y="43" width="7" height="7.5" rx="1.4" fill="#FACC15" stroke="#0F0A24" strokeWidth="1.4" />
        </g>
      )}

      {/* 3. BIKER LEATHER JACKET */}
      {v === 'biker' && (
        <g>
          <path d="M21 20L10 52L19 55L26 32Z" fill={dark} stroke="#0F0A24" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M59 20L70 52L61 55L54 32Z" fill={dark} stroke="#0F0A24" strokeWidth="2.2" strokeLinejoin="round" />
          {/* Cropped Leather Jacket */}
          <path
            d="M21 19C28 16 52 16 59 19L56 60H24L21 19Z"
            fill={item.primary}
            stroke="#0F0A24"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {/* Inner Tee */}
          <path d="M32 18H48L42 40L32 18Z" fill={item.secondary} stroke="#0F0A24" strokeWidth="1.5" />
          {/* Wide Snap Lapels */}
          <path d="M32 18L22 25L29 36L39 39Z" fill={light} stroke="#0F0A24" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M48 18L58 25L51 36L41 39Z" fill={light} stroke="#0F0A24" strokeWidth="1.7" strokeLinejoin="round" />
          {/* Silver Studs & Asymmetric Diagonal Zipper */}
          <circle cx="26" cy="26" r="1.6" fill="#E2E8F0" />
          <circle cx="54" cy="26" r="1.6" fill="#E2E8F0" />
          <line x1="46" y1="26" x2="36" y2="57" stroke="#E2E8F0" strokeWidth="2.5" strokeLinecap="round" />
          {/* Leather Hem Belt */}
          <rect x="23" y="54" width="34" height="5.5" rx="1.5" fill="#111118" stroke="#0F0A24" strokeWidth="1.5" />
          <rect x="37" y="53.5" width="6" height="6.5" rx="1.2" fill="#E2E8F0" stroke="#0F0A24" strokeWidth="1.2" />
        </g>
      )}

      {/* 4. ROYAL ADMIRAL COAT */}
      {v === 'admiral' && (
        <g>
          <path d="M21 21L10 54L19 57L26 33Z" fill={dark} stroke="#0F0A24" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M59 21L70 54L61 57L54 33Z" fill={dark} stroke="#0F0A24" strokeWidth="2.2" strokeLinejoin="round" />
          {/* Gold Sleeve Stripes */}
          <line x1="11.5" y1="50" x2="19.5" y2="52" stroke="#FACC15" strokeWidth="2.6" />
          <line x1="68.5" y1="50" x2="60.5" y2="52" stroke="#FACC15" strokeWidth="2.6" />
          {/* Long Admiral Coat */}
          <path
            d="M21 20C28 17 52 17 59 20L59 68C48 71 32 71 21 68L21 20Z"
            fill={item.primary}
            stroke="#0F0A24"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {/* High Mandarin Collar */}
          <rect x="31" y="13" width="18" height="7" rx="2" fill={item.primary} stroke="#FACC15" strokeWidth="1.8" />
          {/* Gold Shoulder Epaulets */}
          <rect x="17" y="17" width="11" height="5.5" rx="2" fill="#FACC15" stroke="#0F0A24" strokeWidth="1.5" />
          <rect x="52" y="17" width="11" height="5.5" rx="2" fill="#FACC15" stroke="#0F0A24" strokeWidth="1.5" />
          {/* Diagonal Ceremonial Sash */}
          <path d="M25 20L56 58L51 62L21 24Z" fill="#FACC15" stroke="#0F0A24" strokeWidth="1.4" />
          {/* Medal Buttons */}
          <circle cx="34" cy="32" r="2.1" fill="#FACC15" stroke="#0F0A24" strokeWidth="1" />
          <circle cx="46" cy="32" r="2.1" fill="#FACC15" stroke="#0F0A24" strokeWidth="1" />
          <circle cx="34" cy="43" r="2.1" fill="#FACC15" stroke="#0F0A24" strokeWidth="1" />
          <circle cx="46" cy="43" r="2.1" fill="#FACC15" stroke="#0F0A24" strokeWidth="1" />
        </g>
      )}

      {/* 5. SLEEVELESS DETECTIVE VEST */}
      {v === 'vest' && (
        <g>
          {/* Rolled White Shirt Sleeves + Forearms */}
          <path d="M22 22L11 44L20 47L27 32Z" fill={item.secondary} stroke="#0F0A24" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M58 22L69 44L60 47L53 32Z" fill={item.secondary} stroke="#0F0A24" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M12 44L9 55L17 57L19 46Z" fill="#F5C49E" stroke="#0F0A24" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M68 44L71 55L63 57L61 46Z" fill="#F5C49E" stroke="#0F0A24" strokeWidth="1.8" strokeLinejoin="round" />
          {/* Shirt Base + Tailored Vest */}
          <path d="M23 19C29 16 51 16 57 19L56 64L40 69L24 64L23 19Z" fill={item.primary} stroke="#0F0A24" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M31 17H49L40 40L31 17Z" fill={item.secondary} stroke="#0F0A24" strokeWidth="1.6" />
          {/* Tie */}
          <path d="M38 22H42L43 37L40 40L37 37L38 22Z" fill={item.accent} stroke="#0F0A24" strokeWidth="1.3" />
          {/* Pocket Watch Chain */}
          <path d="M40 50C44 55 49 55 52 51" stroke="#FACC15" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="40" cy="46" r="1.8" fill="#FACC15" />
          <circle cx="40" cy="54" r="1.8" fill="#FACC15" />
          <circle cx="40" cy="61" r="1.8" fill="#FACC15" />
        </g>
      )}

      {/* 6. COZY PUFFER JACKET */}
      {v === 'puffer' && (
        <g>
          {/* Chunky Padded Sleeves */}
          <path d="M21 21L8 53L20 57L27 34Z" fill={dark} stroke="#0F0A24" strokeWidth="2.3" strokeLinejoin="round" />
          <path d="M59 21L72 53L60 57L53 34Z" fill={dark} stroke="#0F0A24" strokeWidth="2.3" strokeLinejoin="round" />
          <line x1="14" y1="36" x2="23" y2="39" stroke="#0F0A24" strokeWidth="1.8" />
          <line x1="66" y1="36" x2="57" y2="39" stroke="#0F0A24" strokeWidth="1.8" />
          {/* High Puffy Collar */}
          <rect x="27" y="13" width="26" height="9" rx="4.5" fill={item.secondary} stroke="#0F0A24" strokeWidth="2.1" />
          {/* Quilted Puffer Torso (4 rounded baffle segments) */}
          <rect x="20" y="21" width="40" height="12" rx="6" fill={item.primary} stroke="#0F0A24" strokeWidth="2.2" />
          <rect x="19" y="32" width="42" height="12" rx="6" fill={light} stroke="#0F0A24" strokeWidth="2.2" />
          <rect x="19" y="43" width="42" height="12" rx="6" fill={item.primary} stroke="#0F0A24" strokeWidth="2.2" />
          <rect x="21" y="54" width="38" height="12" rx="6" fill={dark} stroke="#0F0A24" strokeWidth="2.2" />
          {/* Center Contrast Zipper */}
          <line x1="40" y1="21" x2="40" y2="66" stroke={item.accent} strokeWidth="3" strokeLinecap="round" />
          <circle cx="40" cy="24" r="2.2" fill={item.accent} stroke="#0F0A24" strokeWidth="1.1" />
        </g>
      )}

      {/* 7. VELVET SMOKING JACKET / EVENING GOWN */}
      {v === 'velvet' && (
        <g>
          {/* Puffed Sleeves for Female Gown or Satin Cuffed Sleeves */}
          {isFemale ? (
            <>
              <circle cx="21" cy="25" r="8" fill={light} stroke="#0F0A24" strokeWidth="2.2" />
              <circle cx="59" cy="25" r="8" fill={light} stroke="#0F0A24" strokeWidth="2.2" />
              <path
                d="M23 20C30 17 50 17 57 20L66 71C50 75 30 75 14 71L23 20Z"
                fill={item.primary}
                stroke="#0F0A24"
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
              <path d="M29 20C35 28 45 28 51 20" fill={item.secondary} stroke="#0F0A24" strokeWidth="1.6" />
              <rect x="22" y="42" width="36" height="5" rx="2" fill={item.accent} stroke="#0F0A24" strokeWidth="1.4" />
              <circle cx="40" cy="44.5" r="3" fill="#FFFBEB" stroke="#0F0A24" strokeWidth="1.2" />
            </>
          ) : (
            <>
              <path d="M21 20L10 53L19 56L26 32Z" fill={dark} stroke="#0F0A24" strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M59 20L70 53L61 56L54 32Z" fill={dark} stroke="#0F0A24" strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M21 19C28 16 52 16 59 19L58 67C47 70 33 70 22 67L21 19Z" fill={item.primary} stroke="#0F0A24" strokeWidth="2.4" strokeLinejoin="round" />
              {/* Plush Shawl Collar */}
              <path d="M31 17H49L40 42L31 17Z" fill={item.secondary} stroke="#0F0A24" strokeWidth="1.5" />
              <path d="M31 17C24 23 26 35 39 42L31 17Z" fill={item.accent} stroke="#0F0A24" strokeWidth="1.6" />
              <path d="M49 17C56 23 54 35 41 42L49 17Z" fill={item.accent} stroke="#0F0A24" strokeWidth="1.6" />
              {/* Gold Waist Sash */}
              <rect x="22" y="49" width="36" height="5" rx="2" fill={item.accent} stroke="#0F0A24" strokeWidth="1.4" />
            </>
          )}
        </g>
      )}

      {/* 8. VARSITY BOMBER JACKET */}
      {v === 'varsity' && (
        <g>
          {/* Contrast Cream Sleeves */}
          <path d="M21 20L10 53L19 56L26 33Z" fill={item.secondary} stroke="#0F0A24" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M59 20L70 53L61 56L54 33Z" fill={item.secondary} stroke="#0F0A24" strokeWidth="2.2" strokeLinejoin="round" />
          {/* Striped Ribbed Cuffs */}
          <rect x="10.5" y="51" width="9.5" height="5" rx="1.5" fill={item.primary} stroke="#0F0A24" strokeWidth="1.4" />
          <rect x="60" y="51" width="9.5" height="5" rx="1.5" fill={item.primary} stroke="#0F0A24" strokeWidth="1.4" />
          {/* Bomber Body */}
          <path d="M22 20C29 17 51 17 58 20L57 64H23L22 20Z" fill={item.primary} stroke="#0F0A24" strokeWidth="2.4" strokeLinejoin="round" />
          {/* Striped Collar & Waistband */}
          <path d="M29 17C35 23 45 23 51 17" stroke={item.secondary} strokeWidth="4.5" strokeLinecap="round" />
          <rect x="22" y="58" width="36" height="6.5" rx="2" fill={item.secondary} stroke="#0F0A24" strokeWidth="1.6" />
          <line x1="24" y1="61.2" x2="56" y2="61.2" stroke={item.primary} strokeWidth="2" />
          {/* Snap Buttons + Varsity M Patch */}
          <circle cx="40" cy="29" r="1.7" fill={item.secondary} />
          <circle cx="40" cy="39" r="1.7" fill={item.secondary} />
          <circle cx="40" cy="49" r="1.7" fill={item.secondary} />
          <rect x="45" y="29" width="9" height="10" rx="2" fill={item.accent} stroke="#0F0A24" strokeWidth="1.3" />
          <path d="M47 37V31L49.5 34.5L52 31V37" stroke="#181036" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {/* 9 & 10. CLASSIC TUXEDO & MOBSTER PINSTRIPE */}
      {(v === 'tuxedo' || v === 'pinstripe') && (
        <g>
          <path d="M21 20L10 54L20 57L27 33Z" fill={dark} stroke="#0F0A24" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M59 20L70 54L60 57L53 33Z" fill={dark} stroke="#0F0A24" strokeWidth="2.2" strokeLinejoin="round" />
          <rect x="11" y="53" width="9" height="4" rx="1.5" fill={item.secondary} stroke="#0F0A24" strokeWidth="1.4" />
          <rect x="60" y="53" width="9" height="4" rx="1.5" fill={item.secondary} stroke="#0F0A24" strokeWidth="1.4" />
          <path
            d={
              isFemale
                ? 'M23 19C29 16 51 16 57 19L55 44L59 66C48 69 32 69 21 66L25 44L23 19Z'
                : 'M21 19C28 16 52 16 59 19L57 67C47 70 33 70 23 67L21 19Z'
            }
            fill={item.primary}
            stroke="#0F0A24"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {v === 'pinstripe' && (
            <g stroke="#FFFFFF" strokeOpacity="0.32" strokeWidth="1.2">
              <line x1="27" y1="21" x2="27" y2="66" />
              <line x1="33" y1="29" x2="33" y2="67" />
              <line x1="47" y1="29" x2="47" y2="67" />
              <line x1="53" y1="21" x2="53" y2="66" />
            </g>
          )}
          <path d="M31 17H49L40 42L31 17Z" fill={item.secondary} stroke="#0F0A24" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M31 17L24 27L30 33L39 43L31 17Z" fill={light} stroke="#0F0A24" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M49 17L56 27L50 33L41 43L49 17Z" fill={light} stroke="#0F0A24" strokeWidth="1.7" strokeLinejoin="round" />
          {v === 'tuxedo' && isFemale ? (
            <g>
              <path d="M34 22L40 25L34 28Z" fill={item.accent} stroke="#0F0A24" strokeWidth="1.3" />
              <path d="M46 22L40 25L46 28Z" fill={item.accent} stroke="#0F0A24" strokeWidth="1.3" />
              <circle cx="40" cy="25" r="2.2" fill={item.accent} stroke="#0F0A24" strokeWidth="1.2" />
            </g>
          ) : v === 'tuxedo' ? (
            <g>
              <path
                d="M38 22H42L43.5 39L40 43.5L36.5 39L38 22Z"
                fill={item.accent}
                stroke="#0F0A24"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </g>
          ) : (
            <g>
              <path d="M38 22H42L43 39L40 43L37 39L38 22Z" fill={item.accent} stroke="#0F0A24" strokeWidth="1.3" strokeLinejoin="round" />
              {/* Gold watch chain */}
              <path d="M40 50C45 55 50 54 54 49" stroke="#FACC15" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </g>
          )}
          <path d="M47 36L52 33L55 37H47Z" fill={item.accent} stroke="#0F0A24" strokeWidth="1.2" strokeLinejoin="round" />
          <circle cx="43.5" cy="49" r="1.9" fill="#FACC15" stroke="#0F0A24" strokeWidth="1" />
          <circle cx="43.5" cy="57" r="1.9" fill="#FACC15" stroke="#0F0A24" strokeWidth="1" />
        </g>
      )}
    </svg>
  );
}

export function PantsThumbSvg({
  gender,
  pantsId,
  className = 'w-14 h-14',
}: {
  gender: Gender;
  pantsId: number;
  className?: string;
}) {
  const item = PANTS_CATALOG[gender][pantsId % 10];
  const dark = shadeHex(item.primary, 0.72);
  const light = shadeHex(item.primary, 1.22);
  const v = item.variant;
  const isSkirt =
    v === 'pleated_midi' ||
    v === 'pinstripe_mini' ||
    v === 'ruffled_skirt' ||
    v === 'flared_mini' ||
    v === 'suspenders_skirt' ||
    v === 'gala_ruffled';
  const isMini = v === 'pinstripe_mini' || v === 'flared_mini';
  const isRuffled = v === 'ruffled_skirt' || v === 'gala_ruffled';
  const hasSuspenders = v === 'suspenders' || v === 'suspenders_skirt';

  return (
    <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
      <ellipse cx="40" cy="74" rx="20" ry="3.8" fill="#0A061C" opacity="0.45" />

      {/* Suspenders straps above waist */}
      {hasSuspenders && (
        <g>
          <path d="M28 19L30 7" stroke={item.accent} strokeWidth="3.8" strokeLinecap="round" />
          <path d="M52 19L50 7" stroke={item.accent} strokeWidth="3.8" strokeLinecap="round" />
          <circle cx="28" cy="19" r="2.2" fill="#FACC15" stroke="#0F0A24" strokeWidth="1" />
          <circle cx="52" cy="19" r="2.2" fill="#FACC15" stroke="#0F0A24" strokeWidth="1" />
        </g>
      )}

      {isSkirt ? (
        <g>
          <path
            d={
              isMini
                ? 'M24 22H56L64 56C48 61 32 61 16 56L24 22Z'
                : 'M24 20H56L66 66C50 71 30 71 14 66L24 20Z'
            }
            fill={item.primary}
            stroke="#0F0A24"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {v === 'pinstripe_mini' && (
            <g stroke="#FFFFFF" strokeOpacity="0.32" strokeWidth="1.2">
              <line x1="30" y1="24" x2="26" y2="56" />
              <line x1="40" y1="24" x2="40" y2="58" />
              <line x1="50" y1="24" x2="54" y2="56" />
            </g>
          )}
          {isRuffled && (
            <>
              <path
                d="M17 44C30 48 50 48 63 44"
                stroke={light}
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M15 56C30 61 50 61 65 56"
                stroke={item.accent}
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </>
          )}
          {!isRuffled && (
            <>
              <path d="M32 24L27 62" stroke={dark} strokeWidth="2" strokeLinecap="round" />
              <path d="M40 24V64" stroke={dark} strokeWidth="2" strokeLinecap="round" />
              <path d="M48 24L53 62" stroke={dark} strokeWidth="2" strokeLinecap="round" />
            </>
          )}
          <rect x="23" y="16" width="34" height="7" rx="2.5" fill={dark} stroke="#0F0A24" strokeWidth="2" />
          <rect x="35" y="16" width="10" height="7" rx="1.5" fill={item.accent} stroke="#0F0A24" strokeWidth="1.4" />
        </g>
      ) : v === 'shorts' ? (
        <g>
          {/* Knee-length Shorts */}
          <path
            d="M23 18H57L60 49H44L40 36L36 49H20L23 18Z"
            fill={item.primary}
            stroke="#0F0A24"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <rect x="22" y="15" width="36" height="7" rx="2.5" fill={dark} stroke="#0F0A24" strokeWidth="2" />
          <rect x="36" y="15.5" width="8" height="6" rx="1.5" fill={item.accent} stroke="#0F0A24" strokeWidth="1.4" />
          {/* Bare lower legs & crew socks */}
          <rect x="25" y="49" width="8" height="12" rx="3" fill="#F5C49E" stroke="#0F0A24" strokeWidth="1.8" />
          <rect x="47" y="49" width="8" height="12" rx="3" fill="#F5C49E" stroke="#0F0A24" strokeWidth="1.8" />
          <rect x="24.5" y="58" width="9" height="8" rx="2" fill="#FFFFFF" stroke="#0F0A24" strokeWidth="1.6" />
          <rect x="46.5" y="58" width="9" height="8" rx="2" fill="#FFFFFF" stroke="#0F0A24" strokeWidth="1.6" />
        </g>
      ) : (
        <g>
          {/* Trousers / Cargo / Jeans / Joggers / Plaid / Wide-Leg / Culottes */}
          <path
            d={
              v === 'wide_belted' || v === 'culottes'
                ? 'M22 18H58L64 67H45L40 39L35 67H16L22 18Z'
                : 'M23 18H57L60 68H45L40 38L35 68H20L23 18Z'
            }
            fill={item.primary}
            stroke="#0F0A24"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          {/* Waistband & Belt */}
          <rect x="22" y="15" width="36" height="7" rx="2.5" fill={dark} stroke="#0F0A24" strokeWidth="2" />
          <rect x="36" y="15.5" width="8" height="6" rx="1.5" fill={item.accent} stroke="#0F0A24" strokeWidth="1.4" />

          {/* Cargo Side Pockets */}
          {v === 'cargo' && (
            <>
              <rect x="17" y="36" width="8" height="12" rx="2" fill={light} stroke="#0F0A24" strokeWidth="1.6" />
              <rect x="55" y="36" width="8" height="12" rx="2" fill={light} stroke="#0F0A24" strokeWidth="1.6" />
              <line x1="17" y1="40" x2="25" y2="40" stroke={item.accent} strokeWidth="1.8" />
              <line x1="55" y1="40" x2="63" y2="40" stroke={item.accent} strokeWidth="1.8" />
            </>
          )}

          {/* Cuffed Denim Jeans */}
          {v === 'jeans' && (
            <>
              <rect x="19" y="61" width="16" height="7" rx="1.8" fill={item.secondary} stroke="#0F0A24" strokeWidth="1.6" />
              <rect x="45" y="61" width="16" height="7" rx="1.8" fill={item.secondary} stroke="#0F0A24" strokeWidth="1.6" />
              <path d="M25 25C28 28 29 31 28 34" stroke={item.accent} strokeWidth="1.8" strokeLinecap="round" />
              <path d="M55 25C52 28 51 31 52 34" stroke={item.accent} strokeWidth="1.8" strokeLinecap="round" />
            </>
          )}

          {/* Track Joggers (Sport side stripes + ankle cuffs) */}
          {v === 'joggers' && (
            <>
              <line x1="23" y1="23" x2="21" y2="62" stroke={item.accent} strokeWidth="2.8" />
              <line x1="57" y1="23" x2="59" y2="62" stroke={item.accent} strokeWidth="2.8" />
              <rect x="20" y="63" width="15" height="5.5" rx="2.2" fill={item.accent} stroke="#0F0A24" strokeWidth="1.5" />
              <rect x="45" y="63" width="15" height="5.5" rx="2.2" fill={item.accent} stroke="#0F0A24" strokeWidth="1.5" />
            </>
          )}

          {/* Plaid Checkers */}
          {v === 'plaid' && (
            <g stroke={item.secondary} strokeWidth="1.5" strokeOpacity="0.65">
              <line x1="28" y1="22" x2="26" y2="66" />
              <line x1="52" y1="22" x2="54" y2="66" />
              <line x1="22" y1="34" x2="58" y2="34" />
              <line x1="21" y1="48" x2="36" y2="48" />
              <line x1="44" y1="48" x2="59" y2="48" />
              <line x1="20" y1="59" x2="35" y2="59" />
              <line x1="45" y1="59" x2="60" y2="59" />
            </g>
          )}

          {/* Pinstripe / Gala side stripe */}
          {(v === 'pinstripe' || v === 'gala') && (
            <>
              <line x1="25" y1="23" x2="23" y2="66" stroke={item.accent} strokeWidth="2.2" />
              <line x1="55" y1="23" x2="57" y2="66" stroke={item.accent} strokeWidth="2.2" />
            </>
          )}
        </g>
      )}
    </svg>
  );
}

export function HatThumbSvg({
  hatId,
  className = 'w-14 h-14',
}: {
  hatId: number | 'none';
  className?: string;
}) {
  if (hatId === 'none') {
    return (
      <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
        {/* Subtle faded hat outline underneath */}
        <g opacity="0.35">
          <ellipse cx="40" cy="52" rx="26" ry="7" fill="#6D5CA8" />
          <path d="M23 50L28 28C32 25 48 25 52 28L57 50Z" fill="#8D7AC9" />
        </g>
        {/* Crisp prohibited slash circle */}
        <circle cx="40" cy="40" r="24" stroke="#FF4B6A" strokeWidth="5.5" fill="#1C1442" fillOpacity="0.32" />
        <line x1="23" y1="23" x2="57" y2="57" stroke="#FF4B6A" strokeWidth="5.5" strokeLinecap="round" />
      </svg>
    );
  }

  const item = HAT_CATALOG[hatId % 10];
  const light = shadeHex(item.primary, 1.3);

  return (
    <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
      <ellipse cx="40" cy="66" rx="24" ry="4" fill="#0A061C" opacity="0.45" />

      {item.variant === 'fedora' && (
        <g transform="rotate(-6 40 42)">
          <ellipse cx="40" cy="52" rx="31" ry="8.5" fill={item.primary} stroke="#0F0A24" strokeWidth="2.4" />
          <path
            d="M19 50L25 23C27 19 32 18 36 20L40 22L44 20C48 18 53 19 55 23L61 50Z"
            fill={light}
            stroke="#0F0A24"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M20.5 43.5C30 47.5 50 47.5 59.5 43.5" stroke={item.secondary} strokeWidth="6.2" strokeLinecap="round" />
          <circle cx="52" cy="44" r="2.8" fill={item.accent} stroke="#0F0A24" strokeWidth="1.2" />
        </g>
      )}

      {item.variant === 'bowler' && (
        <g>
          <ellipse cx="40" cy="54" rx="28" ry="7.5" fill={item.primary} stroke="#0F0A24" strokeWidth="2.4" />
          <path d="M20 52C20 26 30 18 40 18C50 18 60 26 60 52Z" fill={light} stroke="#0F0A24" strokeWidth="2.4" />
          <path d="M20.5 46C31 49.5 49 49.5 59.5 46" stroke={item.secondary} strokeWidth="5.5" strokeLinecap="round" />
          <path d="M29 28C32 24 38 23 42 24" stroke="#FFFFFF" strokeOpacity="0.3" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}

      {item.variant === 'top_hat' && (
        <g>
          <ellipse cx="40" cy="58" rx="28" ry="6.5" fill={item.primary} stroke="#0F0A24" strokeWidth="2.4" />
          <path d="M23 56L20 17H60L57 56Z" fill={light} stroke="#0F0A24" strokeWidth="2.4" strokeLinejoin="round" />
          <rect x="22" y="45" width="36" height="7" fill={item.secondary} stroke="#0F0A24" strokeWidth="1.6" />
          <rect x="35" y="44" width="10" height="9" rx="1.5" fill={item.accent} stroke="#0F0A24" strokeWidth="1.4" />
        </g>
      )}

      {item.variant === 'beret' && (
        <g transform="rotate(-10 40 42)">
          <path
            d="M14 48C14 32 28 24 44 24C60 24 68 34 65 48C56 54 24 55 14 48Z"
            fill={item.primary}
            stroke="#0F0A24"
            strokeWidth="2.4"
          />
          <path d="M18 48C29 53 51 53 62 47" stroke={item.secondary} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M40 24L43 17" stroke={item.secondary} strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="29" cy="36" r="3" fill={item.accent} />
        </g>
      )}

      {item.variant === 'cap' && (
        <g>
          <path d="M18 48C18 28 28 20 40 20C52 20 60 28 60 48Z" fill={item.primary} stroke="#0F0A24" strokeWidth="2.4" />
          <path d="M18 46H68C69 52 60 55 46 53H18V46Z" fill={item.secondary} stroke="#0F0A24" strokeWidth="2.3" strokeLinejoin="round" />
          <circle cx="39" cy="19" r="3" fill={item.accent} stroke="#0F0A24" strokeWidth="1.5" />
          <path d="M35 33H45L43 41H37L35 33Z" fill={item.accent} />
        </g>
      )}

      {item.variant === 'beanie' && (
        <g>
          <circle cx="40" cy="18" r="6" fill={item.accent} stroke="#0F0A24" strokeWidth="2" />
          <path d="M19 52C19 29 28 21 40 21C52 21 61 29 61 52Z" fill={item.primary} stroke="#0F0A24" strokeWidth="2.4" />
          <rect x="16" y="45" width="48" height="12" rx="5.5" fill={item.secondary} stroke="#0F0A24" strokeWidth="2.3" />
          <line x1="27" y1="47" x2="27" y2="55" stroke="#0F0A24" strokeWidth="1.4" strokeOpacity="0.4" />
          <line x1="40" y1="47" x2="40" y2="55" stroke="#0F0A24" strokeWidth="1.4" strokeOpacity="0.4" />
          <line x1="53" y1="47" x2="53" y2="55" stroke="#0F0A24" strokeWidth="1.4" strokeOpacity="0.4" />
        </g>
      )}

      {item.variant === 'deerstalker' && (
        <g>
          <path d="M10 49C18 43 30 43 40 45C50 43 62 43 70 49C62 55 18 55 10 49Z" fill={item.secondary} stroke="#0F0A24" strokeWidth="2.2" />
          <path d="M20 47C21 27 30 20 40 20C50 20 59 27 60 47Z" fill={item.primary} stroke="#0F0A24" strokeWidth="2.4" />
          <path d="M32 22L40 46L48 22" stroke={item.secondary} strokeWidth="2.2" />
          <circle cx="40" cy="20" r="3" fill={item.accent} stroke="#0F0A24" strokeWidth="1.4" />
        </g>
      )}

      {item.variant === 'cowboy' && (
        <g>
          <path d="M9 46C15 56 65 56 71 46C65 44 59 48 56 48H24C21 48 15 44 9 46Z" fill={item.primary} stroke="#0F0A24" strokeWidth="2.3" strokeLinejoin="round" />
          <path d="M22 48L27 22C31 26 49 26 53 22L58 48Z" fill={light} stroke="#0F0A24" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M23 42H57" stroke={item.secondary} strokeWidth="5.5" strokeLinecap="round" />
          <path d="M40 37L42 42L40 46L38 42Z" fill={item.accent} />
        </g>
      )}

      {item.variant === 'crown' && (
        <g>
          <path
            d="M16 54L12 24L28 38L40 18L52 38L68 24L64 54Z"
            fill={item.primary}
            stroke="#0F0A24"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <rect x="16" y="48" width="48" height="9" rx="3" fill={item.secondary} stroke="#0F0A24" strokeWidth="2.2" />
          <circle cx="40" cy="40" r="4.2" fill={item.accent} stroke="#0F0A24" strokeWidth="1.4" />
          <circle cx="26" cy="44" r="3" fill="#38B6FF" stroke="#0F0A24" strokeWidth="1.2" />
          <circle cx="54" cy="44" r="3" fill="#22E58B" stroke="#0F0A24" strokeWidth="1.2" />
        </g>
      )}

      {item.variant === 'sun_hat' && (
        <g>
          <ellipse cx="40" cy="52" rx="33" ry="10" fill={item.primary} stroke="#0F0A24" strokeWidth="2.4" />
          <path d="M23 48C23 29 30 22 40 22C50 22 57 29 57 48Z" fill={light} stroke="#0F0A24" strokeWidth="2.4" />
          <path d="M23.5 44C32 47.5 48 47.5 56.5 44" stroke={item.secondary} strokeWidth="5.5" strokeLinecap="round" />
          <circle cx="54" cy="44" r="3.5" fill={item.accent} stroke="#0F0A24" strokeWidth="1.3" />
        </g>
      )}
    </svg>
  );
}

export function HairThumbSvg({
  gender,
  hairId,
  hairColor,
  className = 'w-14 h-14',
}: {
  gender: Gender;
  hairId: number;
  hairColor: string;
  className?: string;
}) {
  const catalog = HAIR_CATALOG[gender];
  const variant = catalog[hairId % catalog.length].variant;
  const hi = shadeHex(hairColor, 1.32);
  const dark = shadeHex(hairColor, 0.72);
  const isFemale = gender === 'female';

  // Smooth skull cap used by nearly every style (shared silhouette)
  const renderCap = () => (
    <path
      d="M18 47C17 26 27 16 40 16C53 16 63 26 62 47C56 36 49 32 41 32C32 32 25 36 18 47Z"
      fill={hairColor}
      stroke="#0F0A24"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
  );

  const renderHighlights = () => (
    <path
      d="M27 24C33 19.5 46 19.5 53 24"
      stroke={hi}
      strokeWidth="3"
      strokeLinecap="round"
      strokeOpacity="0.6"
    />
  );

  const renderBackHair = () => {
    switch (variant) {
      case 'long_wavy':
        return (
          <path
            d="M16 38C11 52 13 70 23 76C32 72 30 60 31 50C35 56 45 56 49 50C50 60 48 72 57 76C67 70 69 52 64 38Z"
            fill={dark}
            stroke="#0F0A24"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        );
      case 'long_layered':
        return (
          <path
            d="M18 36C15 48 17 60 25 66H55C63 60 65 48 62 36Z"
            fill={dark}
            stroke="#0F0A24"
            strokeWidth="2.2"
          />
        );
      case 'curly_volume':
        return (
          <g fill={dark} stroke="#0F0A24" strokeWidth="2">
            <circle cx="18" cy="46" r="11" />
            <circle cx="62" cy="46" r="11" />
            <circle cx="24" cy="62" r="10" />
            <circle cx="56" cy="62" r="10" />
            <circle cx="40" cy="68" r="10.5" />
          </g>
        );
      case 'layered_shoulder':
        return (
          <path
            d="M17 38C13 50 17 62 25 67C33 62 30 52 31 44C37 50 45 50 49 44C50 52 47 62 55 67C63 62 67 50 63 38Z"
            fill={dark}
            stroke="#0F0A24"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        );
      case 'half_up_bow':
        return (
          <path
            d="M17 38C13 52 15 68 24 74H56C65 68 67 52 63 38Z"
            fill={dark}
            stroke="#0F0A24"
            strokeWidth="2.2"
          />
        );
      case 'ponytail':
        return (
          <path
            d="M55 22C68 24 72 44 64 64C58 58 57 46 55 34Z"
            fill={dark}
            stroke="#0F0A24"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        );
      case 'pigtails':
        return (
          <g fill={dark} stroke="#0F0A24" strokeWidth="2.1">
            <path d="M23 34C11 38 9 54 15 66C21 62 22 50 24 42Z" />
            <path d="M57 34C69 38 71 54 65 66C59 62 58 50 56 42Z" />
          </g>
        );
      case 'twin_buns':
        return (
          <g fill={hairColor} stroke="#0F0A24" strokeWidth="2.2">
            <circle cx="19" cy="24" r="10" />
            <circle cx="61" cy="24" r="10" />
          </g>
        );
      case 'bob_cut':
        return (
          <path
            d="M17 38C14 52 18 62 25 65C28 58 26 48 27 42H53C54 48 52 58 55 65C62 62 66 52 63 38Z"
            fill={dark}
            stroke="#0F0A24"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        );
      case 'side_braid':
        return (
          <g fill={dark} stroke="#0F0A24" strokeWidth="2">
            <path d="M17 38C14 50 18 62 25 66H53C50 58 51 48 53 40Z" />
            <circle cx="58" cy="50" r="6" />
            <circle cx="61" cy="60" r="5.4" />
            <circle cx="58" cy="69" r="4.6" />
          </g>
        );
      case 'pixie':
        return (
          <path
            d="M20 42C20 28 29 22 40 22C51 22 60 28 60 42C54 34 47 32 40 32C33 32 27 34 20 42Z"
            fill={dark}
            stroke="#0F0A24"
            strokeWidth="2.1"
          />
        );
      default:
        return null;
    }
  };

  const renderStyle = () => {
    switch (variant) {
      case 'bald':
        return (
          <path
            d="M27 26C32 20 48 20 53 26"
            stroke="#FFFFFF"
            strokeOpacity="0.32"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        );
      case 'side_part':
        return (
          <>
            {renderCap()}
            <path
              d="M20 40C26 30 46 26 58 34C52 30 34 34 27 42Z"
              fill={hairColor}
              stroke="#0F0A24"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </>
        );
      case 'spiky':
        return (
          <path
            d="M18 44C17 28 24 19 32 14L36 22L44 12L48 22L58 17L56 28C62 32 63 40 61 45C56 36 48 34 40 34C31 34 23 36 18 44Z"
            fill={hairColor}
            stroke="#0F0A24"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        );
      case 'pompadour':
        return (
          <path
            d="M19 45C17 27 25 13 44 14C60 15 65 26 60 44C55 34 46 31 33 34C25 35 22 39 19 45Z"
            fill={hairColor}
            stroke="#0F0A24"
            strokeWidth="2.2"
          />
        );
      case 'afro':
        return (
          <path
            d="M16 46C9 36 13 18 26 15C33 8 47 8 54 15C67 18 71 36 64 46C58 34 49 32 40 32C31 32 22 34 16 46Z"
            fill={hairColor}
            stroke="#0F0A24"
            strokeWidth="2.2"
          />
        );
      case 'buzz':
        return (
          <path
            d="M20 42C20 27 29 21 40 21C51 21 60 27 60 42C53 34 47 32 40 32C33 32 27 34 20 42Z"
            fill={hairColor}
            stroke="#0F0A24"
            strokeWidth="2.2"
          />
        );
      case 'messy':
      case 'curly_top':
        return (
          <path
            d="M18 45C16 28 24 16 38 16C52 15 63 24 62 44C56 37 51 39 46 34C41 39 34 35 29 39C24 38 21 41 18 45Z"
            fill={hairColor}
            stroke="#0F0A24"
            strokeWidth="2.2"
          />
        );
      case 'slick_back':
      case 'undercut':
        return (
          <path
            d="M20 44C18 24 28 15 41 15C55 15 62 24 60 44C54 33 48 30 40 30C32 30 26 33 20 44Z"
            fill={hairColor}
            stroke="#0F0A24"
            strokeWidth="2.2"
          />
        );
      case 'long_wavy':
        return (
          <>
            {renderCap()}
            <path
              d="M18 34C24 25 40 22 53 28C48 26 30 30 24 44Z"
              fill={hi}
              opacity="0.35"
            />
          </>
        );
      case 'ponytail':
        return (
          <>
            <path
              d="M18 44C18 24 28 15 41 15C55 15 62 24 60 42C54 31 47 28 40 28C32 28 24 33 18 44Z"
              fill={hairColor}
              stroke="#0F0A24"
              strokeWidth="2.2"
            />
            <ellipse cx="57" cy="28" rx="4" ry="3.2" fill="#FF4B6A" stroke="#0F0A24" strokeWidth="1.5" />
          </>
        );
      case 'twin_buns':
        return (
          <>
            {renderCap()}
            <path d="M40 17V32" stroke={dark} strokeWidth="2" strokeLinecap="round" />
            <circle cx="19" cy="24" r="4" fill="#FACC15" stroke="#0F0A24" strokeWidth="1.4" />
            <circle cx="61" cy="24" r="4" fill="#FACC15" stroke="#0F0A24" strokeWidth="1.4" />
          </>
        );
      case 'bob_cut':
        return (
          <>
            {renderCap()}
            <path
              d="M20 42C19 54 22 62 27 63L26 46Z"
              fill={hairColor}
              stroke="#0F0A24"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M60 42C61 54 58 62 53 63L54 46Z"
              fill={hairColor}
              stroke="#0F0A24"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </>
        );
      case 'side_braid':
        return (
          <>
            {renderCap()}
            <path
              d="M22 36C30 26 50 26 56 36C50 32 30 32 22 36Z"
              fill={hi}
              opacity="0.28"
            />
            <circle cx="58" cy="73" r="2.4" fill="#FF4B6A" stroke="#0F0A24" strokeWidth="1.2" />
          </>
        );
      case 'curly_volume':
        return (
          <g fill={hairColor} stroke="#0F0A24" strokeWidth="2">
            <circle cx="24" cy="30" r="9" />
            <circle cx="40" cy="22" r="10" />
            <circle cx="56" cy="30" r="9" />
            <circle cx="20" cy="42" r="7" />
            <circle cx="60" cy="42" r="7" />
          </g>
        );
      case 'pigtails':
        return (
          <>
            {renderCap()}
            <circle cx="24" cy="40" r="3.6" fill="#38B6FF" stroke="#0F0A24" strokeWidth="1.4" />
            <circle cx="56" cy="40" r="3.6" fill="#38B6FF" stroke="#0F0A24" strokeWidth="1.4" />
          </>
        );
      case 'layered_shoulder':
        return (
          <>
            {renderCap()}
            <path
              d="M18 44C20 56 24 62 30 63C27 56 26 50 25 44Z"
              fill={hairColor}
              stroke="#0F0A24"
              strokeWidth="2"
            />
            <path
              d="M62 44C60 56 56 62 50 63C53 56 54 50 55 44Z"
              fill={hairColor}
              stroke="#0F0A24"
              strokeWidth="2"
            />
          </>
        );
      case 'pixie':
        return (
          <>
            <path
              d="M19 44C18 26 28 17 41 17C54 17 63 26 61 44C56 34 50 31 42 31C33 31 24 35 19 44Z"
              fill={hairColor}
              stroke="#0F0A24"
              strokeWidth="2.2"
            />
            <path
              d="M50 20C58 21 62 27 60 34C57 27 53 23 48 22Z"
              fill={hi}
              opacity="0.4"
            />
          </>
        );
      case 'half_up_bow':
        return (
          <>
            {renderCap()}
            <g>
              <path d="M30 16L40 21L30 25Z" fill="#FF3B5C" stroke="#0F0A24" strokeWidth="1.6" />
              <path d="M50 16L40 21L50 25Z" fill="#FF3B5C" stroke="#0F0A24" strokeWidth="1.6" />
              <circle cx="40" cy="20.5" r="2.6" fill="#FF6B84" stroke="#0F0A24" strokeWidth="1.3" />
            </g>
          </>
        );
      default:
        return renderCap();
    }
  };

  return (
    <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
      {renderBackHair()}

      {/* Subtle mannequin head silhouette */}
      <circle cx="40" cy="46" r="20" fill={isFemale ? '#F6CDAA' : '#F2C8A5'} stroke="#0F0A24" strokeWidth="2" />
      {/* Cute minimal eyes */}
      <circle cx="33" cy="48" r="2.2" fill="#1C1429" />
      <circle cx="47" cy="48" r="2.2" fill="#1C1429" />
      <path d="M36 55C38.5 57.5 41.5 57.5 44 55" stroke="#7A4430" strokeWidth="1.8" strokeLinecap="round" />

      {/* Ears stay visible for short / bald styles */}
      {(variant === 'bald' || variant === 'pixie' || variant === 'buzz') && (
        <>
          <circle cx="19.5" cy="47" r="4" fill="#F2C8A5" stroke="#0F0A24" strokeWidth="1.8" />
          <circle cx="60.5" cy="47" r="4" fill="#F2C8A5" stroke="#0F0A24" strokeWidth="1.8" />
        </>
      )}

      {renderStyle()}

      {/* Glossy cartoon hair highlight */}
      {variant !== 'bald' && renderHighlights()}
    </svg>
  );
}

export function RichMapArtSvg({
  mapId,
  className = 'w-full h-20 sm:h-24',
}: {
  mapId: MapId;
  className?: string;
}) {
  if (mapId === 'city') {
    return (
      <svg viewBox="0 0 180 100" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="citySky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A1248" />
            <stop offset="55%" stopColor="#492B8C" />
            <stop offset="100%" stopColor="#89468E" />
          </linearGradient>
          <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="180" height="100" fill="url(#citySky)" />
        {/* Moon & Stars */}
        <circle cx="148" cy="20" r="10" fill="#FEF08A" opacity="0.92" />
        <circle cx="152" cy="18" r="8.5" fill="#2A1B64" />
        <circle cx="42" cy="14" r="1.4" fill="#FFFBEB" />
        <circle cx="88" cy="10" r="1.6" fill="#FDE68A" />
        <circle cx="118" cy="22" r="1.2" fill="#FFFBEB" />
        {/* Distant skyline */}
        <path d="M0 72V38H22V48H42V28H68V42H94V24H122V44H146V34H180V72Z" fill="#221750" />
        {/* Foreground European Buildings */}
        <rect x="6" y="34" width="38" height="44" rx="2" fill="#312066" />
        <rect x="132" y="30" width="42" height="48" rx="2" fill="#2B1C5C" />
        {/* Glowing Warm Windows */}
        {[12, 24, 34].map((x) =>
          [42, 54].map((y) => (
            <rect key={`lw-${x}-${y}`} x={x} y={y} width="6" height="8" rx="1.5" fill="#FBBF24" />
          )),
        )}
        {[140, 152, 164].map((x) =>
          [38, 50, 62].map((y) => (
            <rect key={`rw-${x}-${y}`} x={x} y={y} width="6" height="8" rx="1.5" fill="#FDE047" />
          )),
        )}
        {/* Cobblestone avenue */}
        <path d="M44 76L66 64H114L136 76L180 100H0L44 76Z" fill="#1F1642" />
        <path d="M74 64L52 100H128L106 64Z" fill="#322368" />
        <path d="M88 66L84 98H96L92 66Z" fill="#FACC15" opacity="0.35" />
        {/* Warm Street Lamps */}
        <circle cx="48" cy="54" r="16" fill="url(#lampGlow)" />
        <circle cx="128" cy="52" r="16" fill="url(#lampGlow)" />
        <rect x="47" y="54" width="2.4" height="24" fill="#150E30" />
        <circle cx="48.2" cy="54" r="3.2" fill="#FEF08A" />
        <rect x="127" y="52" width="2.4" height="26" fill="#150E30" />
        <circle cx="128.2" cy="52" r="3.2" fill="#FEF08A" />
      </svg>
    );
  }

  if (mapId === 'office') {
    return (
      <svg viewBox="0 0 180 100" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="officeWall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B211D" />
            <stop offset="100%" stopColor="#5C3224" />
          </linearGradient>
          <radialGradient id="deskLampGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="180" height="100" fill="url(#officeWall)" />
        {/* Big City Window */}
        <rect x="64" y="10" width="54" height="46" rx="3" fill="#231D54" stroke="#7A452C" strokeWidth="3.5" />
        <rect x="70" y="34" width="10" height="20" fill="#151038" />
        <rect x="84" y="24" width="14" height="30" fill="#181242" />
        <rect x="101" y="30" width="12" height="24" fill="#151038" />
        <rect x="88" y="30" width="3" height="3" fill="#FACC15" />
        <rect x="93" y="37" width="3" height="3" fill="#FACC15" />
        <line x1="91" y1="10" x2="91" y2="56" stroke="#7A452C" strokeWidth="2.5" />
        {/* Bookshelves Left & Right */}
        <rect x="8" y="10" width="44" height="62" rx="3" fill="#4A261A" stroke="#78422B" strokeWidth="2" />
        <rect x="13" y="18" width="34" height="7" rx="1" fill="#C2410C" />
        <rect x="13" y="30" width="34" height="7" rx="1" fill="#2563EB" />
        <rect x="13" y="42" width="34" height="7" rx="1" fill="#CA8A04" />
        <rect x="13" y="54" width="34" height="7" rx="1" fill="#059669" />
        <rect x="130" y="10" width="42" height="62" rx="3" fill="#4A261A" stroke="#78422B" strokeWidth="2" />
        <rect x="135" y="18" width="32" height="7" rx="1" fill="#9333EA" />
        <rect x="135" y="30" width="32" height="7" rx="1" fill="#E11D48" />
        <rect x="135" y="42" width="32" height="7" rx="1" fill="#D97706" />
        {/* Warm Floor & Carpet */}
        <rect x="0" y="72" width="180" height="28" fill="#2C1712" />
        <ellipse cx="90" cy="90" rx="68" ry="12" fill="#7F1D1D" opacity="0.85" />
        {/* Executive Mahogany Desk */}
        <rect x="34" y="64" width="112" height="26" rx="4" fill="#63321F" stroke="#36180F" strokeWidth="2" />
        <rect x="40" y="70" width="100" height="14" rx="2" fill="#4E2516" />
        {/* Emerald Banker's Lamp + Glow */}
        <circle cx="116" cy="56" r="24" fill="url(#deskLampGlow)" />
        <path d="M116 64V52" stroke="#FACC15" strokeWidth="3" strokeLinecap="round" />
        <path d="M105 53H127L123 44H109L105 53Z" fill="#22E58B" stroke="#0F2E22" strokeWidth="1.8" />
      </svg>
    );
  }

  // Beach sunset scene
  return (
    <svg viewBox="0 0 180 100" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="beachSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B2B85" />
          <stop offset="52%" stopColor="#9B4D96" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="beachSea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>
      <rect width="180" height="100" fill="url(#beachSky)" />
      {/* Sunset Sun & Reflection */}
      <circle cx="112" cy="48" r="19" fill="#FDE047" />
      <circle cx="112" cy="48" r="25" fill="#F59E0B" opacity="0.28" />
      {/* Ocean */}
      <rect x="0" y="54" width="180" height="22" fill="url(#beachSea)" />
      <rect x="96" y="57" width="32" height="3" rx="1.5" fill="#FDE047" opacity="0.8" />
      <rect x="102" y="63" width="22" height="2.5" rx="1.2" fill="#FEF08A" opacity="0.65" />
      {/* Golden Sandy Shore */}
      <path d="M0 70C36 64 76 74 118 68C144 64 166 68 180 72V100H0V70Z" fill="#F5C97B" />
      <path d="M0 73C38 69 78 78 122 72C146 69 166 72 180 76" stroke="#FFFBEB" strokeWidth="2.5" strokeOpacity="0.8" />
      {/* Beach Umbrella */}
      <path d="M68 82L74 58" stroke="#78350F" strokeWidth="2.4" />
      <path d="M56 60C62 50 84 50 92 60Z" fill="#FF3B5C" stroke="#7F1D1D" strokeWidth="1.5" />
      <path d="M68 60C71 52 77 52 80 60Z" fill="#FFFBEB" />
      {/* Leaning Palm Tree Left */}
      <path d="M22 86C26 62 32 42 42 22" stroke="#7C4A22" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M42 22C26 17 16 24 8 34" stroke="#16A34A" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M42 22C54 14 66 18 74 28" stroke="#22C55E" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M42 22C34 10 46 6 58 10" stroke="#15803D" strokeWidth="5" strokeLinecap="round" />
      <path d="M42 22C24 27 18 36 16 44" stroke="#22C55E" strokeWidth="4.5" strokeLinecap="round" />
      {/* Palm Tree Right */}
      <path d="M164 88C158 64 152 46 144 28" stroke="#7C4A22" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M144 28C130 22 120 28 114 36" stroke="#22C55E" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M144 28C156 20 168 24 176 34" stroke="#16A34A" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Stylized cartoon Chibi Portrait SVG matching each player's live appearance,
 * used on the glowing target selection cards during Active Role Turns & Day Voting.
 */
export function ChibiPortraitSvg({
  appearance,
  className = 'w-16 h-16',
}: {
  appearance: CharacterAppearance;
  className?: string;
}) {
  const suit = SUIT_CATALOG[appearance.gender][appearance.suitId % 10];
  const hat = appearance.hatId === 'none' ? null : HAT_CATALOG[appearance.hatId % 10];
  const hairDark = shadeHex(appearance.hairColor, 0.72);
  const skinShadow = shadeHex(appearance.skinColor, 0.88);
  const isFemale = appearance.gender === 'female';
  const hairStyle =
    HAIR_CATALOG[appearance.gender][
      appearance.hairId % HAIR_CATALOG[appearance.gender].length
    ];
  const isBald = hairStyle.variant === 'bald';

  return (
    <svg viewBox="0 0 88 88" fill="none" className={className} aria-hidden="true">
      {/* Shoulders & Suit */}
      <path
        d="M14 88C16 68 26 62 44 62C62 62 72 68 74 88Z"
        fill={suit.primary}
        stroke="#0F0A24"
        strokeWidth="2.4"
      />
      <path d="M35 63H53L44 82L35 63Z" fill={suit.secondary} />
      <path d="M42 66H46L47.5 81L44 84L40.5 81L42 66Z" fill={suit.accent} />

      {/* Back Hair (female long hair, skipped entirely when bald) */}
      {isFemale && !isBald && hairStyle.variant !== 'pixie' && (
        <path
          d="M20 42C16 58 19 72 28 76H60C69 72 72 58 68 42Z"
          fill={hairDark}
          stroke="#0F0A24"
          strokeWidth="2"
        />
      )}

      {/* Neck & Ears */}
      <rect x="38" y="54" width="12" height="12" rx="5" fill={skinShadow} />
      <circle cx="22" cy="44" r="5.5" fill={appearance.skinColor} stroke="#0F0A24" strokeWidth="2" />
      <circle cx="66" cy="44" r="5.5" fill={appearance.skinColor} stroke="#0F0A24" strokeWidth="2" />

      {/* Sculpted Chibi Head */}
      <rect
        x="23"
        y="22"
        width="42"
        height="40"
        rx="19"
        fill={appearance.skinColor}
        stroke="#0F0A24"
        strokeWidth="2.4"
      />

      {/* Rosy Blush */}
      <ellipse cx="30" cy="49" rx="4.2" ry="2.2" fill="#FF7C9C" opacity="0.42" />
      <ellipse cx="58" cy="49" rx="4.2" ry="2.2" fill="#FF7C9C" opacity="0.42" />

      {/* Cute Chibi Eyes with Catchlights */}
      <g>
        <ellipse cx="34.5" cy="43" rx="4.2" ry="4.8" fill="#1C1224" />
        <circle cx="33" cy="41.2" r="1.5" fill="#FFFFFF" />
        <circle cx="36" cy="45" r="0.8" fill="#FFFFFF" opacity="0.85" />
        <path d="M29.5 39.5C32 37.5 37 37.5 39.5 39.5" stroke="#160E1E" strokeWidth={isFemale ? '2.4' : '1.9'} strokeLinecap="round" />

        <ellipse cx="53.5" cy="43" rx="4.2" ry="4.8" fill="#1C1224" />
        <circle cx="52" cy="41.2" r="1.5" fill="#FFFFFF" />
        <circle cx="55" cy="45" r="0.8" fill="#FFFFFF" opacity="0.85" />
        <path d="M48.5 39.5C51 37.5 56 37.5 58.5 39.5" stroke="#160E1E" strokeWidth={isFemale ? '2.4' : '1.9'} strokeLinecap="round" />

        {isFemale && (
          <>
            <path d="M29.5 39.5L27 37.5" stroke="#160E1E" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M58.5 39.5L61 37.5" stroke="#160E1E" strokeWidth="1.8" strokeLinecap="round" />
          </>
        )}
      </g>

      {/* Eyebrows */}
      <path d="M29.5 34.5C32.5 32.8 36.5 32.8 39 34.5" stroke={appearance.hairColor} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M49 34.5C51.5 32.8 55.5 32.8 58.5 34.5" stroke={appearance.hairColor} strokeWidth="2.4" strokeLinecap="round" />

      {/* Tiny Nose & Warm Smile */}
      <circle cx="44" cy="47.5" r="1.4" fill={skinShadow} />
      <path d="M39 53C41.5 56 46.5 56 49 53" stroke="#7A3D30" strokeWidth="2.2" strokeLinecap="round" />

      {/* Hair Bangs (bald heads keep a clean skin dome) */}
      {!isBald && (
        <path
          d="M22 36C22 21 32 16 44 16C56 16 66 21 66 36C61 29 55 28 49 31L44 26L38 32C32 28 27 30 22 36Z"
          fill={appearance.hairColor}
          stroke="#0F0A24"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}

      {/* Crisp Mini Hat sitting cleanly over hairline (omitted when hatId === 'none') */}
      {hat && (
        <g transform="translate(0, -1)">
          <ellipse cx="44" cy="24" rx="26" ry="5.5" fill={hat.primary} stroke="#0F0A24" strokeWidth="2" />
          <path
            d="M27 23L31 10C34 7 54 7 57 10L61 23Z"
            fill={shadeHex(hat.primary, 1.2)}
            stroke="#0F0A24"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M28 19.5C36 22 52 22 60 19.5" stroke={hat.secondary} strokeWidth="3.8" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

/**
 * Rich procedural Twilight Cityscape SVG Backdrop for the Home Screen,
 * matching the warm-windowed purple evening street from the UI mockup.
 */
export function HomeCityBackdropSvg() {
  return (
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full pointer-events-none select-none opacity-85"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="homeNightSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B134D" />
          <stop offset="46%" stopColor="#3B2378" />
          <stop offset="76%" stopColor="#6D377E" />
          <stop offset="100%" stopColor="#1A1138" />
        </linearGradient>
        <radialGradient id="amberLamp" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FDE047" stopOpacity="0.65" />
          <stop offset="45%" stopColor="#F59E0B" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cobbleRoad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#261852" />
          <stop offset="50%" stopColor="#37226B" />
          <stop offset="100%" stopColor="#170E36" />
        </linearGradient>
      </defs>

      <rect width="1440" height="900" fill="url(#homeNightSky)" />

      {/* Soft twilight clouds */}
      <ellipse cx="320" cy="180" rx="220" ry="42" fill="#5A379E" opacity="0.26" />
      <ellipse cx="960" cy="150" rx="280" ry="48" fill="#6F3E9E" opacity="0.24" />
      <ellipse cx="1280" cy="240" rx="190" ry="38" fill="#90488E" opacity="0.2" />

      {/* Stars */}
      {[
        [140, 88],
        [290, 62],
        [480, 108],
        [690, 56],
        [870, 96],
        [1080, 74],
        [1260, 114],
        [1350, 64],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={i % 2 === 0 ? 2.4 : 1.7} fill="#FEF08A" opacity="0.75" />
      ))}

      {/* Distant purple skyline */}
      <path
        d="M0 640V420H95V470H170V340H265V450H355V370H465V490H575V320H690V440H790V360H910V465H1015V310H1135V420H1245V345H1360V410H1440V640Z"
        fill="#231654"
        opacity="0.88"
      />

      {/* Left Foreground European Facade */}
      <path d="M0 160L170 250V660H0V160Z" fill="#2A1B5C" />
      <path d="M170 250L250 300V655H170V250Z" fill="#21144A" />
      {[
        [24, 250, 36, 54],
        [82, 278, 36, 54],
        [24, 340, 36, 54],
        [82, 364, 36, 54],
        [24, 430, 36, 54],
        [82, 452, 36, 54],
      ].map(([x, y, w, h], i) => (
        <rect key={`lw-${i}`} x={x} y={y} width={w} height={h} rx="4" fill="#FBBF24" opacity="0.82" />
      ))}

      {/* Right Foreground Facade */}
      <path d="M1440 180L1250 270V660H1440V180Z" fill="#261854" />
      <path d="M1250 270L1160 320V655H1250V270Z" fill="#1D1242" />
      {[
        [1300, 295, 36, 52],
        [1362, 268, 36, 52],
        [1300, 385, 36, 52],
        [1362, 362, 36, 52],
        [1300, 474, 36, 52],
        [1362, 456, 36, 52],
      ].map(([x, y, w, h], i) => (
        <rect key={`rw-${i}`} x={x} y={y} width={w} height={h} rx="4" fill="#FDE047" opacity="0.78" />
      ))}

      {/* Street & Sidewalk Perspective */}
      <rect x="0" y="645" width="1440" height="255" fill="url(#cobbleRoad)" />
      <path d="M220 645L0 810V900H1440V810L1220 645Z" fill="#1B123F" opacity="0.62" />
      {/* Warm golden reflection shimmer on street */}
      <ellipse cx="480" cy="760" rx="240" ry="34" fill="#F59E0B" opacity="0.16" />
      <ellipse cx="1020" cy="750" rx="220" ry="32" fill="#F59E0B" opacity="0.14" />

      {/* Glowing Vintage Street Lamps */}
      <circle cx="195" cy="490" r="110" fill="url(#amberLamp)" />
      <rect x="191" y="490" width="8" height="190" fill="#140D30" />
      <ellipse cx="195" cy="490" rx="16" ry="22" fill="#FEF08A" />

      <circle cx="1235" cy="500" r="115" fill="url(#amberLamp)" />
      <rect x="1231" y="500" width="8" height="185" fill="#140D30" />
      <ellipse cx="1235" cy="500" rx="16" ry="22" fill="#FEF08A" />

      {/* Subtle Dark Vignette so Foreground UI stays super crisp */}
      <rect x="0" y="0" width="1440" height="900" fill="#0B071D" opacity="0.24" />
    </svg>
  );
}

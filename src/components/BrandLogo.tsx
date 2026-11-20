import { ROLE_COLORS } from '../shared/abilities';
import { Language, Role } from '../shared/types';

export function RoleIconSvg({
  role,
  className = 'w-6 h-6',
}: {
  role: Role;
  className?: string;
}) {
  switch (role) {
    case 'mafia':
      return (
        <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
          <ellipse cx="18" cy="25.5" rx="15" ry="4.5" fill="#18132B" stroke="#0C0818" strokeWidth="1.8" />
          <path
            d="M8.5 24.5L11.5 11.5C12.2 9.4 14.2 8.4 16 9.1L18 10L20 9.1C21.8 8.4 23.8 9.4 24.5 11.5L27.5 24.5Z"
            fill="#2B2245"
            stroke="#0C0818"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M9.6 20.8C14.2 22.8 21.8 22.8 26.4 20.8" stroke="#FF3B5C" strokeWidth="3.6" strokeLinecap="round" />
          <circle cx="23.5" cy="21" r="1.4" fill="#FACC15" />
        </svg>
      );
    case 'doctor':
      return (
        <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
          <path d="M13 10V7.5C13 6.4 13.9 5.5 15 5.5H21C22.1 5.5 23 6.4 23 7.5V10" stroke="#15803D" strokeWidth="2.6" strokeLinecap="round" />
          <rect
            x="4.5"
            y="9.5"
            width="27"
            height="21"
            rx="5.5"
            fill="#22C55E"
            stroke="#0C2E1B"
            strokeWidth="2"
          />
          <rect x="6.5" y="11.5" width="23" height="6" rx="2.5" fill="#4ADE80" opacity="0.55" />
          <path
            d="M18 14.5V25.5M12.5 20H23.5"
            stroke="#FFFFFF"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'detective':
      return (
        <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
          <path
            d="M22.2 22.2L30.5 30.5"
            stroke="#1E3A8A"
            strokeWidth="5.2"
            strokeLinecap="round"
          />
          <path
            d="M22.2 22.2L30.5 30.5"
            stroke="#3B82F6"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle
            cx="15.5"
            cy="15.5"
            r="9.8"
            fill="#BAE6FD"
            stroke="#1D4ED8"
            strokeWidth="3.2"
          />
          <path
            d="M11 12.2C12.3 10.6 14.4 9.8 16.5 10.2"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'civilian':
    default:
      return (
        <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
          {/* Left silhouette */}
          <circle cx="9.5" cy="14" r="3.6" fill="#6D28D9" stroke="#1E103D" strokeWidth="1.4" />
          <path d="M4 26.5C4.5 21.8 6.8 19.5 9.5 19.5C12.2 19.5 14 21.8 14.5 26.5Z" fill="#6D28D9" stroke="#1E103D" strokeWidth="1.4" />
          {/* Right silhouette */}
          <circle cx="26.5" cy="14" r="3.6" fill="#6D28D9" stroke="#1E103D" strokeWidth="1.4" />
          <path d="M21.5 26.5C22 21.8 23.8 19.5 26.5 19.5C29.2 19.5 31.5 21.8 32 26.5Z" fill="#6D28D9" stroke="#1E103D" strokeWidth="1.4" />
          {/* Center lead silhouette */}
          <circle cx="18" cy="12" r="4.6" fill="#9333EA" stroke="#1E103D" strokeWidth="1.6" />
          <path d="M10.5 28.5C11 22.5 14 19.5 18 19.5C22 19.5 25 22.5 25.5 28.5Z" fill="#9333EA" stroke="#1E103D" strokeWidth="1.6" />
        </svg>
      );
  }
}

export function SleepBedSvg({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 48" fill="none" className={className} aria-hidden="true">
      {/* Crisp Glowing White Bed Silhouette matching mockup */}
      <path
        d="M8 14V40M56 26V40M8 32H56"
        stroke="#FFFFFF"
        strokeWidth="5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Pillow */}
      <circle cx="18.5" cy="24" r="5" fill="#FFFFFF" />
      {/* Blanket dome */}
      <path
        d="M27 29V20C27 18.4 28.3 17 30 17H49C52.9 17 56 20.1 56 24V29H27Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * Glowing Ability Card styled directly from the attached MafiaCards mockup:
 * bright neon outer border, colored header ribbon, bright tinted card body,
 * centered bold role icon, and high-contrast readable effect copy.
 */
export function GlowingAbilityCard({
  role,
  headerLabel,
  title,
  description,
  badge,
  compact = false,
}: {
  role: Role;
  headerLabel?: string;
  title: string;
  description: string;
  badge?: string;
  compact?: boolean;
}) {
  const palette: Record<
    Role,
    { border: string; glow: string; headerBg: string; bodyBg: string; titleColor: string; descColor: string }
  > = {
    mafia: {
      border: '#FF4B6A',
      glow: '0 0 22px rgba(255, 59, 92, 0.55), inset 0 0 12px rgba(255, 59, 92, 0.25)',
      headerBg: 'linear-gradient(90deg, #D92648 0%, #FF4B6A 100%)',
      bodyBg: 'linear-gradient(180deg, #FFA3B3 0%, #FF6B84 100%)',
      titleColor: '#3B0814',
      descColor: '#2A0710',
    },
    doctor: {
      border: '#34F59B',
      glow: '0 0 22px rgba(34, 229, 139, 0.52), inset 0 0 12px rgba(34, 229, 139, 0.25)',
      headerBg: 'linear-gradient(90deg, #16A34A 0%, #22E58B 100%)',
      bodyBg: 'linear-gradient(180deg, #BDFCE0 0%, #6EF2B3 100%)',
      titleColor: '#072E1B',
      descColor: '#0A2E1C',
    },
    detective: {
      border: '#4DC4FF',
      glow: '0 0 22px rgba(56, 182, 255, 0.55), inset 0 0 12px rgba(56, 182, 255, 0.25)',
      headerBg: 'linear-gradient(90deg, #2563EB 0%, #38B6FF 100%)',
      bodyBg: 'linear-gradient(180deg, #C7ECFF 0%, #7CD1FF 100%)',
      titleColor: '#0A1E47',
      descColor: '#0F2552',
    },
    civilian: {
      border: '#C084FC',
      glow: '0 0 22px rgba(168, 85, 247, 0.55), inset 0 0 12px rgba(168, 85, 247, 0.25)',
      headerBg: 'linear-gradient(90deg, #7E22CE 0%, #A855F7 100%)',
      bodyBg: 'linear-gradient(180deg, #EAD5FF 0%, #C694FF 100%)',
      titleColor: '#270A47',
      descColor: '#290E47',
    },
  };

  const p = palette[role];
  const fallbackAccent = ROLE_COLORS[role].hex;

  return (
    <div
      className="rounded-2xl p-1.5 transition-transform"
      style={{
        backgroundColor: '#191038',
        border: `2px solid ${p.border}`,
        boxShadow: p.glow,
      }}
    >
      {/* Colored Header Strip */}
      <div
        className="rounded-t-xl px-3 py-1.5 flex items-center justify-between gap-2 text-white font-display font-bold text-xs sm:text-sm"
        style={{ background: p.headerBg }}
      >
        <span className="truncate">{headerLabel ?? title}</span>
        {badge && (
          <span className="px-1.5 py-0.5 rounded-md bg-black/25 text-[10px] sm:text-[11px] font-bold whitespace-nowrap">
            {badge}
          </span>
        )}
      </div>

      {/* Glowing Tinted Interior Card */}
      <div
        className={`rounded-b-xl flex flex-col items-center text-center ${
          compact ? 'px-3 py-2.5 gap-1.5' : 'px-3.5 py-3.5 gap-2'
        }`}
        style={{ background: p.bodyBg }}
      >
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
          style={{ backgroundColor: `${fallbackAccent}22` }}
        >
          <RoleIconSvg role={role} className="w-9 h-9" />
        </div>
        {headerLabel && (
          <div className="font-display font-extrabold text-sm leading-tight" style={{ color: p.titleColor }}>
            {title}
          </div>
        )}
        <p
          className="text-xs font-bold leading-snug"
          style={{ color: p.descColor }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

export function BrandLogo({
  lang,
  size = 'lg',
}: {
  lang: Language;
  size?: 'sm' | 'lg';
}) {
  const isLg = size === 'lg';
  return (
    <div className="relative inline-flex items-end select-none pt-5 sm:pt-7" dir="ltr">
      {/* Iconic Tilted Red-Banded Fedora Perched Directly Over the 'M' */}
      <svg
        viewBox="0 0 92 60"
        className={
          isLg
            ? 'w-20 h-13 sm:w-24 sm:h-16 absolute -top-2 sm:-top-3 -left-3 sm:-left-4 -rotate-12 pointer-events-none drop-shadow-[0_6px_12px_rgba(0,0,0,0.65)] z-10'
            : 'w-12 h-8 absolute -top-1 -left-2 -rotate-12 pointer-events-none z-10'
        }
        fill="none"
        aria-hidden="true"
      >
        <ellipse cx="46" cy="43" rx="40" ry="11" fill="#18132B" stroke="#0C0818" strokeWidth="3.2" />
        <path
          d="M21 40L28 15C30 9.5 36 7 41 9L46 11.5L51 9C56 7 62 9.5 64 15L71 40Z"
          fill="#2D234D"
          stroke="#0C0818"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <path
          d="M23.5 33.5C35 38 57 38 68.5 33.5"
          stroke="#E11D48"
          strokeWidth="7.5"
          strokeLinecap="round"
        />
        <path
          d="M32 18C36 14 42 13 46 15"
          stroke="#FFFFFF"
          strokeOpacity="0.28"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      {/* Bold Cartoon Outlined Wordmark */}
      <span
        className={`font-display font-extrabold tracking-tight leading-none ${
          isLg ? 'text-4xl sm:text-6xl' : 'text-2xl sm:text-3xl'
        }`}
        style={{
          textShadow:
            '-2px -2px 0 #140B33, 2px -2px 0 #140B33, -2px 2px 0 #140B33, 2px 2px 0 #140B33, 0 5px 0 #140B33, 0 12px 24px rgba(8, 4, 24, 0.72)',
        }}
      >
        {lang === 'ar' ? (
          <>
            <span className="text-white">مافيا</span>
            <span className="text-[#FACC15]">كاردز</span>
          </>
        ) : (
          <>
            <span className="text-white">Mafia</span>
            <span className="text-[#FACC15]">Cards</span>
          </>
        )}
      </span>
    </div>
  );
}

import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { ABILITY_POOLS, ROLE_COLORS } from '../shared/abilities';
import { DICTIONARY } from '../shared/i18n';
import { Language, Role } from '../shared/types';
import { GlowingAbilityCard, RoleIconSvg } from './BrandLogo';

interface RulesModalProps {
  lang: Language;
  onClose: () => void;
}

const ROLE_ORDER: Role[] = ['mafia', 'doctor', 'detective', 'civilian'];

export function RulesModal({ lang, onClose }: RulesModalProps) {
  const t = DICTIONARY[lang];
  const [tab, setTab] = useState<'overview' | 'cards'>('cards');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');

  const rolesToShow: Role[] = roleFilter === 'all' ? ROLE_ORDER : [roleFilter];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090616]/85"
      role="dialog"
      aria-modal="true"
      aria-label={t.rulesTitle}
    >
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-3xl bg-[#1A133C] border-2 border-purple-300/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-purple-300/15 bg-[#231952]">
          <h2 className="font-display text-lg sm:text-xl font-extrabold text-white text-start inline-flex items-center gap-2">
            <Star className="w-5 h-5 text-[#FACC15] fill-[#FACC15]" />
            <span>{t.rulesTitle}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-2 px-5 pt-4 pb-2">
          <button
            type="button"
            onClick={() => setTab('overview')}
            className={`px-4 py-2 rounded-xl font-display text-sm font-extrabold transition-colors whitespace-nowrap ${
              tab === 'overview'
                ? 'bg-[#FACC15] text-[#181036]'
                : 'bg-[#2B1F5C] text-purple-200 hover:bg-[#372875]'
            }`}
          >
            {t.rulesOverviewTab}
          </button>
          <button
            type="button"
            onClick={() => setTab('cards')}
            className={`px-4 py-2 rounded-xl font-display text-sm font-extrabold transition-colors whitespace-nowrap ${
              tab === 'cards'
                ? 'bg-[#FACC15] text-[#181036]'
                : 'bg-[#2B1F5C] text-purple-200 hover:bg-[#372875]'
            }`}
          >
            {t.rulesCardsTab}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto mafia-scroll px-5 pb-5 pt-2">
          {tab === 'overview' ? (
            <div className="space-y-4">
              <ol className="space-y-2.5">
                {t.rulesSteps.map((step, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#241B52] border border-purple-300/15 text-sm sm:text-base text-purple-100 leading-relaxed text-start"
                  >
                    <span className="w-7 h-7 rounded-lg bg-[#FACC15] text-[#181036] font-extrabold flex items-center justify-center shrink-0 tabular-nums">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {ROLE_ORDER.map((r) => (
                  <div
                    key={r}
                    className="p-4 rounded-2xl border-2 flex items-start gap-3 text-start"
                    style={{
                      backgroundColor: ROLE_COLORS[r].softBg,
                      borderColor: ROLE_COLORS[r].border,
                    }}
                  >
                    <RoleIconSvg role={r} className="w-9 h-9 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-display font-extrabold text-base" style={{ color: ROLE_COLORS[r].text }}>
                        {t.roles[r].name}
                      </div>
                      <p className="text-xs sm:text-sm text-purple-100/90 mt-1 leading-relaxed">
                        {t.roles[r].objective}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Role Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRoleFilter('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-colors ${
                    roleFilter === 'all'
                      ? 'bg-white text-[#181036]'
                      : 'bg-[#2B1F5C] text-purple-200 hover:bg-[#382975]'
                  }`}
                >
                  21 / 21
                </button>
                {ROLE_ORDER.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(r)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-colors inline-flex items-center gap-1.5"
                    style={{
                      backgroundColor: roleFilter === r ? ROLE_COLORS[r].hex : '#2B1F5C',
                      color: roleFilter === r ? '#120C26' : ROLE_COLORS[r].text,
                    }}
                  >
                    <span>{t.roles[r].name}</span>
                    <span className="tabular-nums">({ABILITY_POOLS[r].length})</span>
                  </button>
                ))}
              </div>

              {rolesToShow.map((role) => (
                <div key={role} className="space-y-3">
                  <div className="flex items-center gap-2 pt-1">
                    <RoleIconSvg role={role} className="w-6 h-6" />
                    <h3
                      className="font-display font-extrabold text-base"
                      style={{ color: ROLE_COLORS[role].text }}
                    >
                      {t.roles[role].name} ({ABILITY_POOLS[role].length})
                    </h3>
                  </div>

                  {/* Vibrant Glowing Ability Card Grid matching Mockup */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {ABILITY_POOLS[role].map((abilityId, idx) => {
                      const copy = t.abilities[abilityId];
                      return (
                        <GlowingAbilityCard
                          key={abilityId}
                          role={role}
                          headerLabel={`${t.roles[role].name} (${idx + 1}/${ABILITY_POOLS[role].length})`}
                          title={copy.name}
                          description={copy.desc}
                          badge={copy.shortHint}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

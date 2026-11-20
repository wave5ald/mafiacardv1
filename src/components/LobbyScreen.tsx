import { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Crown,
  Dices,
  Globe,
  Lock,
  Palette,
  PersonStanding,
  Play,
  Plus,
  RotateCcw,
  ScanFace,
  Search,
  Settings,
  Shield,
  SkipForward,
  Trash2,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  Vote,
} from 'lucide-react';
import { audioSynth } from '../audio/synth';
import {
  BALD_HAIR_ID,
  DEFAULT_APPEARANCE,
  getDefaultAppearanceForGender,
  getRandomAppearanceForGender,
  HAIR_CATALOG,
  HAIR_COLORS,
  HAT_CATALOG,
  PANTS_CATALOG,
  SKIN_COLORS,
  SUIT_CATALOG,
} from '../shared/catalog';
import { DICTIONARY, formatTemplate } from '../shared/i18n';
import {
  CharacterAppearance,
  GameSettings,
  Gender,
  Language,
  MapId,
  RoomViewState,
  ValidationErrorPayload,
} from '../shared/types';
import { CharacterPreviewCanvas, PreviewZoom } from '../three/CharacterPreviewCanvas';
import {
  ChibiPortraitSvg,
  HairThumbSvg,
  HatThumbSvg,
  PantsThumbSvg,
  RichMapArtSvg,
  SuitThumbSvg,
} from './WardrobeArtwork';

interface LobbyScreenProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  room: RoomViewState;
  muted: boolean;
  onToggleMute: () => void;
  onOpenRules: () => void;
  onLeave: () => void;
  onUpdateAppearance: (next: CharacterAppearance) => void;
  onToggleReady: (ready: boolean) => void;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onAddBot: () => void;
  onRemoveBot: (botId?: string) => void;
  onFillToFive: () => void;
  onStartGame: () => Promise<ValidationErrorPayload['code'] | null>;
}

type WardrobeTab = 'suits' | 'pants' | 'hats' | 'hair';

export function LobbyScreen({
  lang,
  onChangeLang,
  room,
  muted,
  onToggleMute,
  onOpenRules,
  onLeave,
  onUpdateAppearance,
  onToggleReady,
  onUpdateSettings,
  onAddBot,
  onRemoveBot,
  onFillToFive,
  onStartGame,
}: LobbyScreenProps) {
  const t = DICTIONARY[lang];
  const mePlayer = room.players.find((p) => p.id === room.me.playerId);
  const isHost = Boolean(mePlayer?.isHost);
  const appearance = mePlayer?.appearance ?? DEFAULT_APPEARANCE;

  const [activeTab, setActiveTab] = useState<WardrobeTab>('suits');
  const [zoom, setZoom] = useState<PreviewZoom>('full');
  const [rotSignal, setRotSignal] = useState<{ dir: -1 | 1; seq: number }>({ dir: 1, seq: 0 });
  const [copied, setCopied] = useState(false);
  const [startError, setStartError] = useState<ValidationErrorPayload['code'] | null>(null);

  const playerCount = room.players.length;
  const mafiaLocked = playerCount <= 6;
  const requiredMin = Math.max(4, room.settings.minPlayers);
  const allReady = room.players.every((p) => p.isReady);
  const canStart = isHost && playerCount >= requiredMin && allReady;

  const handleCopyCode = async () => {
    audioSynth.click();
    try {
      await navigator.clipboard?.writeText(room.roomCode);
    } catch {
      // fallback ignore
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const patchAppearance = (patch: Partial<CharacterAppearance>) => {
    audioSynth.click();
    onUpdateAppearance({ ...appearance, ...patch });
  };

  const handleSwitchGender = (nextGender: Gender) => {
    if (nextGender === appearance.gender) return;
    audioSynth.click();
    onUpdateAppearance(
      getDefaultAppearanceForGender(nextGender, {
        skinColor: appearance.skinColor,
        hairColor: appearance.hairColor,
      }),
    );
  };

  const handleRandomizeLook = () => {
    audioSynth.click();
    onUpdateAppearance(getRandomAppearanceForGender(appearance.gender));
  };

  const handleResetLook = () => {
    audioSynth.click();
    onUpdateAppearance(getDefaultAppearanceForGender(appearance.gender));
  };

  const handleStartClick = async () => {
    setStartError(null);
    const err = await onStartGame();
    if (err) {
      setStartError(err);
      audioSynth.error();
    } else {
      audioSynth.confirm();
    }
  };

  const wardrobeItems = (() => {
    if (activeTab === 'suits') {
      return SUIT_CATALOG[appearance.gender].map((_item, idx) => ({
        id: idx,
        label: t.suits[appearance.gender][idx],
        selected: appearance.suitId === idx,
        onPick: () => patchAppearance({ suitId: idx }),
        thumb: <SuitThumbSvg gender={appearance.gender} suitId={idx} className="w-12 h-12 sm:w-14 sm:h-14" />,
      }));
    }
    if (activeTab === 'pants') {
      return PANTS_CATALOG[appearance.gender].map((_item, idx) => ({
        id: idx,
        label: t.pants[appearance.gender][idx],
        selected: appearance.pantsId === idx,
        onPick: () => patchAppearance({ pantsId: idx }),
        thumb: <PantsThumbSvg gender={appearance.gender} pantsId={idx} className="w-12 h-12 sm:w-14 sm:h-14" />,
      }));
    }
    if (activeTab === 'hats') {
      return [
        {
          id: 'none' as const,
          label: t.noHat,
          selected: appearance.hatId === 'none',
          onPick: () => patchAppearance({ hatId: 'none' }),
          thumb: <HatThumbSvg hatId="none" className="w-12 h-12 sm:w-14 sm:h-14" />,
        },
        ...HAT_CATALOG.map((_item, idx) => ({
          id: idx,
          label: t.hats[idx],
          selected: appearance.hatId === idx,
          onPick: () => patchAppearance({ hatId: idx }),
          thumb: <HatThumbSvg hatId={idx} className="w-12 h-12 sm:w-14 sm:h-14" />,
        })),
      ];
    }
    // "Bald" is always the very first tile, then the 10 sculpted styles
    const hairIds = HAIR_CATALOG[appearance.gender].map((_item, idx) => idx);
    const orderedHairIds = [
      BALD_HAIR_ID,
      ...hairIds.filter((id) => id !== BALD_HAIR_ID),
    ];
    return orderedHairIds.map((idx) => ({
      id: idx,
      label: t.hairs[appearance.gender][idx],
      selected: appearance.hairId === idx,
      onPick: () => patchAppearance({ hairId: idx }),
      thumb: (
        <HairThumbSvg
          gender={appearance.gender}
          hairId={idx}
          hairColor={appearance.hairColor}
          className="w-12 h-12 sm:w-14 sm:h-14"
        />
      ),
    }));
  })();

  const wardrobeCounts: Record<WardrobeTab, number> = {
    suits: SUIT_CATALOG[appearance.gender].length,
    pants: PANTS_CATALOG[appearance.gender].length,
    hats: HAT_CATALOG.length + 1,
    hair: HAIR_CATALOG[appearance.gender].length,
  };

  const timerRows = [
    { key: 'mafiaTimeSec' as const, label: t.mafiaTime, min: 15, max: 60, icon: Clock, color: 'text-[#FF6B84]' },
    { key: 'doctorTimeSec' as const, label: t.doctorTime, min: 15, max: 60, icon: Shield, color: 'text-[#22E58B]' },
    { key: 'detectiveTimeSec' as const, label: t.detectiveTime, min: 15, max: 60, icon: Search, color: 'text-[#38B6FF]' },
    { key: 'votingTimeSec' as const, label: t.votingTime, min: 20, max: 90, icon: Vote, color: 'text-[#FACC15]' },
  ];

  return (
    <div
      className="min-h-screen w-full flex flex-col bg-[#140E30] text-white overflow-x-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 50% 0%, rgba(105, 56, 198, 0.38) 0%, #19113D 48%, #0E0924 100%)',
      }}
    >
      {/* Top Bar matching Mockup */}
      <header className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 border-b border-purple-300/15 bg-[#1B1340]/95">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              audioSynth.click();
              onLeave();
            }}
            aria-label={t.back}
            className="min-h-[42px] px-3 py-2 rounded-2xl bg-[#291E5A] hover:bg-[#382A78] border border-purple-300/25 text-sm font-bold text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{t.back}</span>
          </button>

          {/* Room Code Chip */}
          <div className="min-h-[42px] px-3.5 py-1.5 rounded-2xl bg-[#241A52] border border-purple-300/25 inline-flex items-center gap-2">
            <span className="text-xs font-semibold text-purple-200/80 hidden sm:inline">
              {t.roomCode}:
            </span>
            <span
              dir="ltr"
              data-testid="room-code-display"
              className="font-mono text-base sm:text-lg font-extrabold tracking-widest text-[#FACC15]"
            >
              {room.roomCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-2 py-1 rounded-lg bg-[#FACC15]/15 hover:bg-[#FACC15]/30 text-xs font-bold text-[#FEF08A] inline-flex items-center gap-1 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? t.copied : t.copyCode}</span>
            </button>
          </div>
        </div>

        {/* Player Counter & Utility Icons */}
        <div className="flex items-center gap-2">
          <div
            data-testid="lobby-player-counter"
            className="min-h-[42px] px-3.5 py-1.5 rounded-2xl bg-[#241A52] border border-purple-300/25 inline-flex items-center gap-2 text-sm font-extrabold tabular-nums"
          >
            <Users className="w-4 h-4 text-white" />
            <span>{playerCount}/10</span>
          </div>

          <div className="relative inline-flex items-center">
            <Globe className="w-3.5 h-3.5 text-[#FACC15] absolute start-2.5 pointer-events-none" />
            <select
              aria-label="Language"
              value={lang}
              onChange={(e) => {
                audioSynth.click();
                onChangeLang(e.target.value as Language);
              }}
              className="min-h-[42px] ps-8 pe-6 py-1.5 rounded-2xl bg-[#291E5A] border border-purple-300/25 text-xs sm:text-sm font-bold text-white cursor-pointer"
            >
              <option value="en">{t.langEnglish}</option>
              <option value="ar">{t.langArabic}</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              audioSynth.click();
              onOpenRules();
            }}
            aria-label={t.rulesAndCards}
            className="w-10 h-10 rounded-2xl bg-[#291E5A] hover:bg-[#382A78] border border-purple-300/25 text-[#FACC15] flex items-center justify-center shrink-0"
          >
            <BookOpen className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? t.soundOff : t.soundOn}
            className="w-10 h-10 rounded-2xl bg-[#291E5A] hover:bg-[#382A78] border border-purple-300/25 text-white flex items-center justify-center shrink-0"
          >
            {muted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-[#22E58B]" />}
          </button>
        </div>
      </header>

      {/* Compact Live Player Roster + Tucked-In Bot Fill Controls */}
      <section className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 pt-2.5">
        <div className="px-3 py-2 rounded-2xl bg-[#1D1545]/90 border border-purple-300/20 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {room.players.map((p) => {
              const isMe = p.id === room.me.playerId;
              return (
                <div
                  key={p.id}
                  className={`ps-1.5 pe-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs ${
                    p.isReady
                      ? 'bg-[#173630] border-[#22E58B]/55'
                      : 'bg-[#281E56] border-purple-300/25'
                  }`}
                >
                  <ChibiPortraitSvg appearance={p.appearance} className="w-6 h-6 rounded-full bg-[#140E30] shrink-0" />
                  <span className={`font-bold ${isMe ? 'text-[#FACC15]' : 'text-white'}`}>
                    {p.name}
                  </span>
                  {p.isHost && <Crown className="w-3.5 h-3.5 text-[#FACC15]" />}
                  {p.isBot && <Bot className="w-3.5 h-3.5 text-[#38B6FF]" />}
                  {p.isReady && <Check className="w-3.5 h-3.5 text-[#22E58B]" />}
                  {isHost && p.isBot && (
                    <button
                      type="button"
                      onClick={() => {
                        audioSynth.click();
                        onRemoveBot(p.id);
                      }}
                      aria-label={`${t.removeBot} ${p.name}`}
                      className="text-rose-300 hover:text-rose-200 p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {isHost && playerCount < 10 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  audioSynth.click();
                  onAddBot();
                }}
                className="min-h-[36px] px-3 py-1 rounded-xl bg-[#2E2168] hover:bg-[#3E2E87] border border-[#38B6FF]/45 text-xs font-bold text-[#7FD3FF] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{t.addBot}</span>
              </button>
              {playerCount < 5 && (
                <button
                  type="button"
                  onClick={() => {
                    audioSynth.confirm();
                    onFillToFive();
                  }}
                  className="min-h-[36px] px-3 py-1 rounded-xl bg-[#3D2880] hover:bg-[#4F35A3] border border-[#FACC15]/50 text-xs font-bold text-[#FEF08A] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.fillLobby}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Main 3-Column Customizer & Match Settings Layout matching Mockup */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-3 sm:px-6 py-3 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Column 1 (Start): "Customize Your Character" + 3D Turntable Framed by < and > Arrows */}
        <section
          className="lg:col-span-4 rounded-3xl border border-purple-300/25 p-4 flex flex-col justify-between relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #21174E 0%, #171038 100%)',
          }}
        >
          <div className="z-10 text-start space-y-2">
            <div>
              <h1 className="font-display font-extrabold text-lg sm:text-xl text-white leading-tight">
                {t.customizeCharacter}
              </h1>
              <span className="text-xs font-semibold text-purple-200/75">
                {mePlayer?.name} · {t.dragToRotate}
              </span>
            </div>

            {/* Preview controls: zoom framing, randomize & reset */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div
                role="group"
                aria-label={t.customizeCharacter}
                className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-[#241A52] border border-purple-300/25"
              >
                <button
                  type="button"
                  onClick={() => {
                    audioSynth.click();
                    setZoom('full');
                  }}
                  aria-pressed={zoom === 'full'}
                  className={`min-h-[32px] px-2 py-1 rounded-lg text-[11px] font-extrabold inline-flex items-center gap-1 transition-colors ${
                    zoom === 'full'
                      ? 'bg-[#FACC15] text-[#181036] shadow-[0_2px_10px_rgba(250,204,21,0.4)]'
                      : 'text-purple-200 hover:bg-[#31246E]'
                  }`}
                >
                  <PersonStanding className="w-3.5 h-3.5" />
                  <span>{t.zoomFullBody}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    audioSynth.click();
                    setZoom('face');
                  }}
                  aria-pressed={zoom === 'face'}
                  className={`min-h-[32px] px-2 py-1 rounded-lg text-[11px] font-extrabold inline-flex items-center gap-1 transition-colors ${
                    zoom === 'face'
                      ? 'bg-[#FACC15] text-[#181036] shadow-[0_2px_10px_rgba(250,204,21,0.4)]'
                      : 'text-purple-200 hover:bg-[#31246E]'
                  }`}
                >
                  <ScanFace className="w-3.5 h-3.5" />
                  <span>{t.zoomFaceHair}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleRandomizeLook}
                aria-label={t.randomizeLook}
                title={t.randomizeLook}
                className="min-h-[34px] px-2.5 py-1 rounded-xl bg-[#241A52] hover:bg-[#33256B] border border-purple-300/25 text-[11px] font-extrabold text-purple-100 inline-flex items-center gap-1 transition-colors"
              >
                <Dices className="w-3.5 h-3.5 text-[#FACC15]" />
                <span>{t.randomizeLook}</span>
              </button>
              <button
                type="button"
                onClick={handleResetLook}
                aria-label={t.resetLook}
                title={t.resetLook}
                className="min-h-[34px] px-2.5 py-1 rounded-xl bg-[#241A52] hover:bg-[#33256B] border border-purple-300/25 text-[11px] font-extrabold text-purple-100 inline-flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#7FD3FF]" />
                <span>{t.resetLook}</span>
              </button>
            </div>
          </div>

          {/* 3D Character Turntable with clean < and > arrows on left/right */}
          <div className="w-full h-[320px] sm:h-[380px] lg:h-[470px] relative my-1">
            <CharacterPreviewCanvas
              appearance={appearance}
              rotationStepSignal={rotSignal}
              zoom={zoom}
            />

            <button
              type="button"
              onClick={() => {
                audioSynth.click();
                setRotSignal((s) => ({ dir: -1, seq: s.seq + 1 }));
              }}
              aria-label={t.rotateLeft}
              className="w-11 h-11 rounded-full bg-[#241A52]/85 hover:bg-[#3A2B7E] border border-purple-300/35 text-white flex items-center justify-center absolute start-1 top-1/2 -translate-y-1/2 z-10 shadow-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.8]" />
            </button>

            <button
              type="button"
              onClick={() => {
                audioSynth.click();
                setRotSignal((s) => ({ dir: 1, seq: s.seq + 1 }));
              }}
              aria-label={t.rotateRight}
              className="w-11 h-11 rounded-full bg-[#241A52]/85 hover:bg-[#3A2B7E] border border-purple-300/35 text-white flex items-center justify-center absolute end-1 top-1/2 -translate-y-1/2 z-10 shadow-lg transition-colors"
            >
              <ChevronRight className="w-6 h-6 stroke-[2.8]" />
            </button>
          </div>
        </section>

        {/* Column 2 (Center): Yellow-Tab 4-Col Illustrated Wardrobe + Rich Map Selection */}
        <section className="lg:col-span-5 flex flex-col gap-3.5">
          {/* Wardrobe Panel */}
          <div className="rounded-3xl bg-[#1C1442] border border-purple-300/25 p-3.5 flex flex-col gap-3">
            {/* 4 Wardrobe Pill Tabs */}
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ['suits', t.tabSuits],
                  ['pants', t.tabPants],
                  ['hats', t.tabHats],
                  ['hair', t.tabHair],
                ] as const
              ).map(([tabKey, label]) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => {
                    audioSynth.click();
                    setActiveTab(tabKey);
                  }}
                  aria-pressed={activeTab === tabKey}
                  className={`min-h-[42px] px-1.5 py-1.5 rounded-xl font-display text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap inline-flex items-center justify-center gap-1 ${
                    activeTab === tabKey
                      ? 'bg-[#FACC15] text-[#181036] shadow-[0_6px_18px_rgba(250,204,21,0.38)]'
                      : 'bg-[#2B205C] text-purple-100 hover:bg-[#392B78] border border-purple-300/20'
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`min-w-[16px] px-1 rounded-full text-[9px] font-extrabold tabular-nums ${
                      activeTab === tabKey
                        ? 'bg-[#181036]/20 text-[#181036]'
                        : 'bg-black/25 text-purple-200'
                    }`}
                  >
                    {wardrobeCounts[tabKey]}
                  </span>
                </button>
              ))}
            </div>

            {/* 4-Column Illustrated Wardrobe Grid (all 10 variants scrollable cleanly) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-[300px] overflow-y-auto overscroll-contain mafia-scroll pe-1">
              {wardrobeItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onPick}
                  className={`p-2 rounded-2xl border-2 text-center flex flex-col items-center justify-between gap-1 min-h-[96px] transition-all ${
                    item.selected
                      ? 'bg-[#31246E] border-[#FACC15] shadow-[0_0_16px_rgba(250,204,21,0.42)]'
                      : 'bg-[#251B54] border-purple-300/20 hover:border-purple-200/55 hover:bg-[#2E2268]'
                  }`}
                >
                  <div className="flex items-center justify-center pt-0.5">
                    {item.thumb}
                  </div>
                  <span className="text-[11px] font-bold text-purple-100 leading-tight line-clamp-1 w-full">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Map Selection (City, Office, Beach) with Rich Illustrated Artwork & Gold Active Border */}
          <div className="rounded-3xl bg-[#1C1442] border border-purple-300/25 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-extrabold text-base text-white">{t.mapSelection}</h2>
              {!isHost && (
                <span className="text-xs text-purple-300/75 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" /> {t.host}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {(['city', 'office', 'beach'] as MapId[]).map((mapId) => {
                const active = room.settings.mapId === mapId;
                return (
                  <button
                    key={mapId}
                    type="button"
                    disabled={!isHost}
                    onClick={() => {
                      audioSynth.click();
                      onUpdateSettings({ mapId });
                    }}
                    className={`rounded-2xl overflow-hidden border-2 text-center transition-all flex flex-col ${
                      active
                        ? 'border-[#FACC15] shadow-[0_0_22px_rgba(250,204,21,0.5)] scale-[1.01]'
                        : 'border-purple-300/25 hover:border-purple-200/60'
                    } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <div className="w-full overflow-hidden">
                      <RichMapArtSvg mapId={mapId} />
                    </div>
                    <div
                      className={`py-2 px-2 font-display text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 ${
                        active ? 'bg-[#291C5E] text-[#FEF08A]' : 'bg-[#140E30] text-white'
                      }`}
                    >
                      <span>{t.maps[mapId].name}</span>
                      {active && <Check className="w-3.5 h-3.5 text-[#FACC15]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Column 3 (End): Appearance & Game Settings + Golden Save & Ready CTA */}
        <section className="lg:col-span-3 rounded-3xl bg-[#1C1442] border border-purple-300/25 p-4 flex flex-col justify-between gap-3.5">
          <div className="space-y-3.5">
            {/* Appearance Section */}
            <div className="space-y-2.5 text-start">
              <h2 className="font-display font-extrabold text-base text-white inline-flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#FACC15]" />
                <span>{t.appearance}</span>
              </h2>

              {/* Gender Row with Blue ♂ / Purple ♀ Icon Buttons */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-purple-200/85">{t.gender}</span>
                <div className="grid grid-cols-2 gap-1.5 w-40">
                  <button
                    type="button"
                    onClick={() => handleSwitchGender('male')}
                    className={`min-h-[38px] px-2.5 py-1 rounded-xl text-xs font-extrabold border-2 inline-flex items-center justify-center gap-1 transition-all ${
                      appearance.gender === 'male'
                        ? 'bg-[#2563EB] border-[#93C5FD] text-white shadow-[0_0_14px_rgba(37,99,235,0.55)]'
                        : 'bg-[#251B54] border-purple-300/25 text-purple-200 hover:bg-[#31246E]'
                    }`}
                  >
                    <span className="text-sm leading-none">♂</span>
                    <span>{t.male}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchGender('female')}
                    className={`min-h-[38px] px-2.5 py-1 rounded-xl text-xs font-extrabold border-2 inline-flex items-center justify-center gap-1 transition-all ${
                      appearance.gender === 'female'
                        ? 'bg-[#9333EA] border-[#E9D5FF] text-white shadow-[0_0_14px_rgba(147,51,234,0.55)]'
                        : 'bg-[#251B54] border-purple-300/25 text-purple-200 hover:bg-[#31246E]'
                    }`}
                  >
                    <span className="text-sm leading-none">♀</span>
                    <span>{t.female}</span>
                  </button>
                </div>
              </div>

              {/* Skin Color Swatches with Gold Ring Halo */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-purple-200/85">{t.skinTone}</div>
                <div className="flex flex-wrap gap-2">
                  {SKIN_COLORS.map((hex) => {
                    const active = appearance.skinColor === hex;
                    return (
                      <button
                        key={hex}
                        type="button"
                        aria-label={`${t.skinTone} ${hex}`}
                        aria-pressed={active}
                        onClick={() => patchAppearance({ skinColor: hex })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          active
                            ? 'border-[#FACC15] ring-2 ring-[#FACC15]/70 shadow-[0_0_12px_rgba(250,204,21,0.75)] scale-110'
                            : 'border-white/30 hover:scale-110 hover:border-[#FACC15]/70 hover:ring-2 hover:ring-[#FACC15]/25'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Hair Color Swatches with Gold Ring Halo */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-purple-200/85">{t.hairColor}</div>
                <div className="flex flex-wrap gap-2">
                  {HAIR_COLORS.map((hex) => {
                    const active = appearance.hairColor === hex;
                    return (
                      <button
                        key={hex}
                        type="button"
                        aria-label={`${t.hairColor} ${hex}`}
                        aria-pressed={active}
                        onClick={() => patchAppearance({ hairColor: hex })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          active
                            ? 'border-[#FACC15] ring-2 ring-[#FACC15]/70 shadow-[0_0_12px_rgba(250,204,21,0.75)] scale-110'
                            : 'border-white/30 hover:scale-110 hover:border-[#FACC15]/70 hover:ring-2 hover:ring-[#FACC15]/25'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <hr className="border-purple-300/15" />

            {/* Game Settings Section */}
            <div className="space-y-2 text-start">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-extrabold text-base text-white inline-flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#38B6FF]" />
                  <span>{t.gameSettings}</span>
                </h2>
                {!isHost && <Lock className="w-3.5 h-3.5 text-purple-300/70" />}
              </div>

              {/* Mafia Count (Strictly Locked to 1 when <= 6 players) */}
              <div className="p-2 rounded-2xl bg-[#251B54] border border-purple-300/20 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-purple-100">{t.mafiaCount}</span>
                  <div className="flex items-center gap-1.5">
                    {([1, 2] as const).map((cnt) => {
                      const disabled = !isHost || (cnt === 2 && mafiaLocked);
                      const active = room.settings.mafiaCount === cnt;
                      return (
                        <button
                          key={cnt}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            audioSynth.click();
                            onUpdateSettings({ mafiaCount: cnt });
                          }}
                          className={`w-8 h-7 rounded-lg text-xs font-extrabold transition-colors tabular-nums ${
                            active
                              ? 'bg-[#FF3B5C] text-white shadow'
                              : disabled
                                ? 'bg-[#171133] text-purple-300/35 cursor-not-allowed'
                                : 'bg-[#31246E] text-purple-200 hover:bg-[#3F2F8C]'
                          }`}
                        >
                          {cnt}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {mafiaLocked && (
                  <p className="text-[11px] text-amber-300/90 leading-tight">
                    {t.mafiaLockedHint}
                  </p>
                )}
              </div>

              {/* Turn Timer Steppers (< 30s > style) */}
              {timerRows.map(({ key, label, min, max, icon: Icon, color }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#251B54]/90 border border-purple-300/15 text-xs"
                >
                  <span className="text-purple-100 font-semibold inline-flex items-center gap-1.5 truncate">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
                    <span className="truncate">{label}</span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0" dir="ltr">
                    {isHost && (
                      <button
                        type="button"
                        aria-label={`Decrease ${label}`}
                        onClick={() => {
                          audioSynth.click();
                          onUpdateSettings({ [key]: Math.max(min, room.settings[key] - 5) });
                        }}
                        className="w-6 h-6 rounded-lg bg-[#352775] hover:bg-[#49369E] text-white flex items-center justify-center"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="min-w-[38px] text-center font-extrabold text-[#FEF08A] tabular-nums">
                      {room.settings[key]}
                      {t.secondsShort}
                    </span>
                    {isHost && (
                      <button
                        type="button"
                        aria-label={`Increase ${label}`}
                        onClick={() => {
                          audioSynth.click();
                          onUpdateSettings({ [key]: Math.min(max, room.settings[key] + 5) });
                        }}
                        className="w-6 h-6 rounded-lg bg-[#352775] hover:bg-[#49369E] text-white flex items-center justify-center"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Skip Vote Green Pill Switch matching Mockup */}
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#251B54]/90 border border-purple-300/15 text-xs">
                <span className="text-purple-100 font-semibold inline-flex items-center gap-1.5">
                  <SkipForward className="w-3.5 h-3.5 text-purple-200" />
                  <span>{t.skipVoteSetting}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={room.settings.skipVoteEnabled}
                  aria-label={t.skipVoteSetting}
                  disabled={!isHost}
                  onClick={() => {
                    audioSynth.click();
                    onUpdateSettings({ skipVoteEnabled: !room.settings.skipVoteEnabled });
                  }}
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors flex items-center ${
                    room.settings.skipVoteEnabled ? 'bg-[#22C55E] justify-end' : 'bg-[#3B2E73] justify-start'
                  } ${!isHost ? 'opacity-70 cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Golden Save & Ready + Host Start Game CTAs */}
          <div className="space-y-2 pt-1">
            {startError && (
              <p role="alert" className="text-xs font-bold text-[#FF6B84] text-center">
                {formatTemplate(t.errors[startError], { min: requiredMin })}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                audioSynth.confirm();
                onToggleReady(!mePlayer?.isReady);
              }}
              className={`w-full min-h-[48px] px-4 py-2.5 rounded-2xl font-display text-base font-extrabold inline-flex items-center justify-center gap-2 border-b-4 transition-all ${
                mePlayer?.isReady
                  ? 'bg-[#22E58B] border-[#15995D] text-[#0D2118] shadow-[0_8px_22px_rgba(34,229,139,0.4)]'
                  : 'bg-gradient-to-b from-[#FDE047] to-[#F59E0B] border-[#B45309] text-[#1A1038] hover:brightness-105 shadow-[0_8px_22px_rgba(250,204,21,0.42)]'
              }`}
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>{mePlayer?.isReady ? t.readyConfirmed : t.saveAndReady}</span>
            </button>

            {isHost ? (
              <button
                type="button"
                data-start="true"
                onClick={handleStartClick}
                disabled={!canStart}
                className={`w-full min-h-[48px] px-4 py-2.5 rounded-2xl font-display text-base font-extrabold inline-flex items-center justify-center gap-2 transition-all ${
                  canStart
                    ? 'bg-gradient-to-b from-[#FF4B6A] to-[#DC1E42] border-b-4 border-[#9F1239] text-white hover:brightness-105 shadow-[0_10px_26px_rgba(255,59,92,0.45)] cursor-pointer'
                    : 'bg-[#281E54] text-purple-300/65 cursor-not-allowed'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                <span>
                  {playerCount < requiredMin
                    ? formatTemplate(t.needMorePlayers, { count: requiredMin - playerCount })
                    : !allReady
                      ? t.waitingAllReady
                      : t.startGame}
                </span>
              </button>
            ) : (
              <div className="text-center text-xs text-purple-200/80 py-1">
                {t.waitingHostStart}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

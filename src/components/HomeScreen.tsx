import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Globe,
  Plus,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { audioSynth } from '../audio/synth';
import { validatePlayerName } from '../game/rules';
import {
  extractRoomCodeFromInput,
  isValidRoomCode,
  ROOM_CODE_LENGTH,
} from '../shared/roomCode';
import { DICTIONARY } from '../shared/i18n';
import { Language, ValidationErrorPayload } from '../shared/types';
import { HeroMascotCanvas } from '../three/HeroMascotCanvas';
import { BrandLogo } from './BrandLogo';
import { HomeCityBackdropSvg } from './WardrobeArtwork';

interface HomeScreenProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  playerName: string;
  onChangePlayerName: (name: string) => void;
  muted: boolean;
  onToggleMute: () => void;
  onOpenRules: () => void;
  onCreateRoom: (name: string) => Promise<ValidationErrorPayload['code'] | null>;
  onJoinRoom: (roomCode: string, name: string) => Promise<ValidationErrorPayload['code'] | null>;
  onQuickSoloDemo: (name: string) => Promise<void>;
  /** Room code taken from a shared invite link (?room=CODE). */
  initialRoomCode?: string | null;
}

export function HomeScreen({
  lang,
  onChangeLang,
  playerName,
  onChangePlayerName,
  muted,
  onToggleMute,
  onOpenRules,
  onCreateRoom,
  onJoinRoom,
  onQuickSoloDemo,
  initialRoomCode,
}: HomeScreenProps) {
  const t = DICTIONARY[lang];
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [nameError, setNameError] = useState<ValidationErrorPayload['code'] | null>(null);
  const [shakeName, setShakeName] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [joinError, setJoinError] = useState<ValidationErrorPayload['code'] | null>(null);
  const [busy, setBusy] = useState(false);

  const nameValidation = validatePlayerName(playerName);

  // Prefill the join dialog from an invite link instead of making the guest retype it.
  useEffect(() => {
    if (!initialRoomCode) return;
    const { code } = extractRoomCodeFromInput(initialRoomCode);
    if (code) setRoomCodeInput(code);
  }, [initialRoomCode]);

  const triggerNameGateError = (code: ValidationErrorPayload['code']) => {
    setNameError(code);
    setShakeName(false);
    requestAnimationFrame(() => setShakeName(true));
    audioSynth.error();
    nameInputRef.current?.focus();
  };

  const handleCreateClick = async () => {
    if (busy) return;
    if (!nameValidation.valid) {
      triggerNameGateError(nameValidation.error ?? 'NAME_REQUIRED');
      return;
    }
    audioSynth.confirm();
    setBusy(true);
    setNameError(null);
    const err = await onCreateRoom(nameValidation.trimmed);
    setBusy(false);
    if (err) {
      triggerNameGateError(err);
    }
  };

  const handleOpenJoinModal = () => {
    if (!nameValidation.valid) {
      triggerNameGateError(nameValidation.error ?? 'NAME_REQUIRED');
      return;
    }
    audioSynth.click();
    setNameError(null);
    setJoinError(null);
    setJoinModalOpen(true);
  };

  const handleConfirmJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!nameValidation.valid) {
      setJoinModalOpen(false);
      triggerNameGateError(nameValidation.error ?? 'NAME_REQUIRED');
      return;
    }
    const cleanCode = roomCodeInput.trim().toUpperCase();
    if (!isValidRoomCode(cleanCode)) {
      setJoinError('INVALID_ROOM_CODE');
      audioSynth.error();
      return;
    }
    audioSynth.confirm();
    setBusy(true);
    setJoinError(null);
    const err = await onJoinRoom(cleanCode, nameValidation.trimmed);
    setBusy(false);
    if (err) {
      setJoinError(err);
      audioSynth.error();
    } else {
      setJoinModalOpen(false);
    }
  };

  const handleSoloDemo = async () => {
    if (busy) return;
    if (!nameValidation.valid) {
      triggerNameGateError(nameValidation.error ?? 'NAME_REQUIRED');
      return;
    }
    audioSynth.confirm();
    setBusy(true);
    setNameError(null);
    await onQuickSoloDemo(nameValidation.trimmed);
    setBusy(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-x-hidden bg-[#150E36]">
      {/* Stylized Twilight Cityscape Background matching the UI Mockup */}
      <HomeCityBackdropSvg />

      {/* Top Bar: Language Dropdown (Start) + Rules & Audio Controls (End) */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 pt-4 sm:pt-6 flex items-center justify-between gap-4 z-10">
        {/* Language Selector Pill Dropdown */}
        <div className="relative inline-flex items-center">
          <Globe className="w-4 h-4 text-[#FACC15] absolute start-3.5 pointer-events-none" />
          <select
            aria-label="Language"
            value={lang}
            onChange={(e) => {
              audioSynth.click();
              onChangeLang(e.target.value as Language);
            }}
            className="min-h-[44px] ps-10 pe-8 py-2 rounded-full bg-[#1C1445]/95 border border-purple-300/35 text-sm font-bold text-white cursor-pointer shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
          >
            <option value="en">{t.langEnglish}</option>
            <option value="ar">{t.langArabic}</option>
          </select>
        </div>

        {/* Utility Buttons: Rules & Audio */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              audioSynth.click();
              onOpenRules();
            }}
            className="min-h-[44px] px-4 py-2 rounded-full bg-[#1C1445]/95 hover:bg-[#2C2066] border border-purple-300/35 text-sm font-bold text-purple-100 inline-flex items-center gap-2 shadow-lg transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4 text-[#FACC15]" />
            <span className="hidden sm:inline">{t.rulesAndCards}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? t.soundOff : t.soundOn}
            className="w-11 h-11 rounded-full bg-[#1C1445]/95 hover:bg-[#2C2066] border border-purple-300/35 text-white flex items-center justify-center shadow-lg transition-colors shrink-0"
          >
            {muted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-[#22E58B]" />}
          </button>
        </div>
      </div>

      {/* Main Split Hero Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center z-10">
        {/* Start Column: Brand Logo, Mandatory Player Name Gate, Glossy Create/Join Cards & Tagline */}
        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-start space-y-5">
          <BrandLogo lang={lang} size="lg" />

          {/* Mandatory Player Name Gate (Always Required Before Create / Join) */}
          <div
            className={`w-full max-w-lg p-4 rounded-3xl bg-[#1A1242]/92 border-2 transition-colors shadow-[0_14px_38px_rgba(7,4,22,0.55)] ${
              nameError
                ? 'border-[#FF3B5C] shadow-[0_0_24px_rgba(255,59,92,0.38)]'
                : 'border-purple-300/35'
            } ${shakeName ? 'animate-shake' : ''}`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5 text-start">
              <label
                htmlFor="player-name-input"
                className="text-xs sm:text-sm font-bold text-purple-100"
              >
                {t.playerNameLabel}
              </label>
              <span className="text-xs font-semibold text-purple-200/75 tabular-nums">
                {playerName.trim().length}/16
              </span>
            </div>
            <input
              ref={nameInputRef}
              id="player-name-input"
              type="text"
              value={playerName}
              maxLength={16}
              autoComplete="nickname"
              placeholder={t.playerNamePlaceholder}
              onChange={(e) => {
                onChangePlayerName(e.target.value);
                if (nameError) setNameError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleCreateClick();
                }
              }}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#100A2B] border border-purple-400/40 text-base font-bold text-white placeholder:text-purple-300/45 focus:outline-none focus:border-[#FACC15] focus:ring-2 focus:ring-[#FACC15]/45 transition-colors"
            />
            <div className="mt-1.5 min-h-[18px] text-start text-xs">
              {nameError ? (
                <span role="alert" className="font-bold text-[#FF6B84]">
                  {t.errors[nameError]}
                </span>
              ) : (
                <span className="text-purple-200/75">{t.playerNameHint}</span>
              )}
            </div>
          </div>

          {/* Glossy Purple Create Room & Join Room Action Cards matching Mockup */}
          <div className="w-full max-w-lg grid grid-cols-2 gap-4">
            <button
              type="button"
              data-start="true"
              onClick={handleCreateClick}
              disabled={busy}
              className={`group relative min-h-[168px] sm:min-h-[184px] p-5 rounded-3xl border-2 transition-all flex flex-col items-center justify-center text-center gap-3 ${
                nameValidation.valid
                  ? 'border-[#C4B5FD]/80 hover:border-[#FACC15] hover:-translate-y-1 shadow-[0_14px_36px_rgba(92,42,204,0.58),inset_0_2px_16px_rgba(255,255,255,0.22)] cursor-pointer'
                  : 'border-purple-400/35 opacity-85 hover:opacity-100 cursor-pointer'
              }`}
              style={{
                background:
                  'linear-gradient(180deg, #6B3FE4 0%, #4E27B8 58%, #361A86 100%)',
              }}
            >
              <span className="w-16 h-16 rounded-2xl bg-white/14 border border-white/25 text-white flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <Plus className="w-11 h-11 stroke-[3.2]" />
              </span>
              <div>
                <div className="font-display text-xl sm:text-2xl font-extrabold text-white drop-shadow">
                  {t.createRoom}
                </div>
                <div className="text-[11px] sm:text-xs text-purple-100/85 mt-0.5 line-clamp-1">
                  {t.createRoomSub}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleOpenJoinModal}
              disabled={busy}
              className={`group relative min-h-[168px] sm:min-h-[184px] p-5 rounded-3xl border-2 transition-all flex flex-col items-center justify-center text-center gap-3 ${
                nameValidation.valid
                  ? 'border-[#A78BFA]/75 hover:border-[#38B6FF] hover:-translate-y-1 shadow-[0_14px_36px_rgba(76,34,176,0.54),inset_0_2px_16px_rgba(255,255,255,0.2)] cursor-pointer'
                  : 'border-purple-400/35 opacity-85 hover:opacity-100 cursor-pointer'
              }`}
              style={{
                background:
                  'linear-gradient(180deg, #5F35CF 0%, #42209E 58%, #2E1573 100%)',
              }}
            >
              <span className="w-16 h-16 rounded-2xl bg-white/14 border border-white/25 text-white flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <Users className="w-10 h-10 stroke-[2.4]" />
              </span>
              <div>
                <div className="font-display text-xl sm:text-2xl font-extrabold text-white drop-shadow">
                  {t.joinRoom}
                </div>
                <div className="text-[11px] sm:text-xs text-purple-100/85 mt-0.5 line-clamp-1">
                  {t.joinRoomSub}
                </div>
              </div>
            </button>
          </div>

          {/* Flanking-Line Tagline + Quick Solo Bot Match Button */}
          <div className="w-full max-w-lg flex flex-col items-center gap-3 pt-1">
            <div className="w-full flex items-center justify-center gap-3">
              <span className="h-[2px] flex-1 max-w-[90px] bg-gradient-to-r from-transparent to-purple-200/60" />
              <p className="font-display text-base sm:text-lg font-bold italic text-purple-100 tracking-wide drop-shadow">
                {t.tagline}
              </p>
              <span className="h-[2px] flex-1 max-w-[90px] bg-gradient-to-l from-transparent to-purple-200/60" />
            </div>

            <button
              type="button"
              onClick={handleSoloDemo}
              disabled={busy}
              className="min-h-[44px] px-5 py-2 rounded-full bg-[#241854]/95 hover:bg-[#342375] border border-[#FACC15]/55 text-sm font-bold text-[#FEF08A] inline-flex items-center gap-2 shadow-lg transition-colors"
            >
              <Sparkles className="w-4 h-4 text-[#FACC15]" />
              <span>{t.quickSoloDemo}</span>
            </button>
          </div>
        </div>

        {/* End Column: Live 3D Chibi Mafia Boss Mascot */}
        <div className="lg:col-span-5 w-full h-[320px] sm:h-[420px] lg:h-[520px] relative">
          <HeroMascotCanvas />
        </div>
      </main>

      {/* Join Room Code Modal */}
      {joinModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090616]/80"
          role="dialog"
          aria-modal="true"
          aria-label={t.enterRoomCode}
        >
          <form
            onSubmit={handleConfirmJoin}
            className="w-full max-w-md p-6 rounded-3xl bg-[#1D1542] border-2 border-purple-400/45 shadow-2xl space-y-4 text-start"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold text-white">{t.enterRoomCode}</h2>
              <button
                type="button"
                onClick={() => setJoinModalOpen(false)}
                aria-label={t.cancel}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-purple-200/85">
              {t.playerNameLabel}: <span className="font-bold text-[#FACC15]">{nameValidation.trimmed}</span>
            </div>

            <input
              type="text"
              dir="ltr"
              autoFocus
              maxLength={ROOM_CODE_LENGTH}
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={roomCodeInput}
              onPaste={(event) => {
                const pasted = event.clipboardData.getData('text');
                if (!pasted.includes('://') && !pasted.includes('room=')) return;
                // Stop the browser from dumping a whole invitation URL into a 5-character field.
                event.preventDefault();
                const { code } = extractRoomCodeFromInput(pasted);
                setRoomCodeInput(code);
                setJoinError(code ? null : 'INVALID_ROOM_CODE');
              }}
              onChange={(e) => {
                const typed = e.target.value;
                if (typed.includes('://') || typed.includes('room=')) {
                  const { code } = extractRoomCodeFromInput(typed);
                  setRoomCodeInput(code);
                  setJoinError(code ? null : 'INVALID_ROOM_CODE');
                  return;
                }
                setRoomCodeInput(
                  typed.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH),
                );
                if (joinError) setJoinError(null);
              }}
              placeholder={t.roomCodePlaceholder}
              className="w-full min-h-[54px] px-4 py-3 rounded-2xl bg-[#110C28] border border-purple-400/45 text-center font-mono text-2xl font-bold tracking-[0.25em] text-[#FACC15] placeholder:text-purple-300/35 placeholder:tracking-normal focus:outline-none focus:border-[#FACC15]"
            />

            {joinError && (
              <p role="alert" className="text-sm font-semibold text-[#FF6B84]">
                {t.errors[joinError]}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setJoinModalOpen(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold text-white"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-[#FACC15] hover:bg-[#FDE047] text-[#181036] text-sm font-bold transition-colors"
              >
                {t.joinNow}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

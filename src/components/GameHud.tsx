import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Eye,
  LogOut,
  RotateCcw,
  Shield,
  SkipForward,
  Sparkles,
  Timer,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { audioSynth } from '../audio/synth';
import { ABILITIES, ROLE_COLORS } from '../shared/abilities';
import { DICTIONARY, formatTemplate } from '../shared/i18n';
import {
  AnnouncementEvent,
  CardActivationEvent,
  Language,
  Role,
  RoomViewState,
  ValidationErrorPayload,
} from '../shared/types';
import { GameSceneCanvas } from '../three/GameSceneCanvas';
import { GlowingAbilityCard, RoleIconSvg, SleepBedSvg } from './BrandLogo';
import { ChibiPortraitSvg } from './WardrobeArtwork';

interface GameHudProps {
  lang: Language;
  room: RoomViewState;
  muted: boolean;
  onToggleMute: () => void;
  onOpenRules: () => void;
  onLeave: () => void;
  onSubmitNightTarget: (targetId: string) => Promise<ValidationErrorPayload['code'] | null>;
  onConfirmNightAction: () => Promise<ValidationErrorPayload['code'] | null>;
  onContinuePhase: () => Promise<ValidationErrorPayload['code'] | null>;
  onSubmitDayVote: (targetId: string | 'SKIP') => Promise<ValidationErrorPayload['code'] | null>;
  onActivateAbility: (
    targetId?: string,
    secondTargetId?: string,
  ) => Promise<ValidationErrorPayload['code'] | null>;
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
}

export function GameHud({
  lang,
  room,
  muted,
  onToggleMute,
  onOpenRules,
  onLeave,
  onSubmitNightTarget,
  onConfirmNightAction,
  onContinuePhase,
  onSubmitDayVote,
  onActivateAbility,
  onPlayAgain,
  onReturnToLobby,
}: GameHudProps) {
  const t = DICTIONARY[lang];
  const mePlayer = room.players.find((p) => p.id === room.me.playerId);
  const myRole = room.me.role;
  const isAlive = Boolean(mePlayer?.alive);
  const isHost = Boolean(mePlayer?.isHost);
  const aliveCount = room.players.filter((p) => p.alive).length;

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [abilityTargetingMode, setAbilityTargetingMode] = useState(false);
  const [abilityTarget1, setAbilityTarget1] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<ValidationErrorPayload['code'] | null>(null);
  const [revealedCardEvent, setRevealedCardEvent] = useState<CardActivationEvent | null>(null);
  const [myCardModalOpen, setMyCardModalOpen] = useState(false);

  // Sync smooth countdown timer from server phaseEndsAt
  useEffect(() => {
    const update = () => {
      const rem = Math.max(0, Math.ceil((room.phaseEndsAt - Date.now()) / 1000));
      setSecondsLeft(rem);
    };
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [room.phaseEndsAt, room.phase]);

  // Reset local ability targeting state on phase transitions
  useEffect(() => {
    setAbilityTargetingMode(false);
    setAbilityTarget1(null);
    setFeedbackError(null);
  }, [room.phase, room.roundNumber]);

  // Trigger dramatic full-screen ability card reveal overlay on public or personal card activation
  const activeCardEvent = room.publicCardEvent ?? room.me.lastCardEvent;
  const activeCardEventId = activeCardEvent?.id ?? null;

  useEffect(() => {
    if (!activeCardEvent || !activeCardEventId) return;
    if (Date.now() - activeCardEvent.timestamp > 5000) return;
    setRevealedCardEvent(activeCardEvent);
    audioSynth.cardActivate();
    const timer = setTimeout(() => setRevealedCardEvent(null), 3200);
    return () => clearTimeout(timer);
  }, [activeCardEventId]);

  // Determine whether viewer is currently asleep
  const isMeSleeping = useMemo(() => {
    if (!isAlive) return false;
    if (room.phase === 'NIGHT_SLEEP') return true;
    if (room.phase === 'NIGHT_MAFIA') return myRole !== 'mafia';
    if (room.phase === 'NIGHT_DOCTOR') return myRole !== 'doctor';
    if (room.phase === 'NIGHT_DETECTIVE') return myRole !== 'detective';
    return false;
  }, [room.phase, myRole, isAlive]);

  const isMyActiveTurn = useMemo(() => {
    if (!isAlive) return false;
    if (room.phase === 'NIGHT_MAFIA' && myRole === 'mafia') return true;
    if (room.phase === 'NIGHT_DOCTOR' && myRole === 'doctor') return true;
    if (room.phase === 'NIGHT_DETECTIVE' && myRole === 'detective') return true;
    if (room.phase === 'DAY_VOTE') return true;
    return false;
  }, [room.phase, myRole, isAlive]);

  const myAbilityDef = room.me.abilityId ? ABILITIES[room.me.abilityId] : null;
  const canUseAbilityNow = useMemo(() => {
    if (!isAlive || !myAbilityDef || room.me.abilityUsed) return false;
    if (mePlayer?.silenced && room.phase === 'DAY_VOTE') return false;
    if (myAbilityDef.timing === room.phase) return true;
    if (
      myAbilityDef.timing === 'PASSIVE_OR_NIGHT' &&
      (room.phase === 'NIGHT_DOCTOR' || room.phase === 'DAY_VOTE')
    ) {
      return true;
    }
    return false;
  }, [isAlive, myAbilityDef, room.me.abilityUsed, mePlayer?.silenced, room.phase]);

  const myCardTimingLabel = useMemo(() => {
    if (!myAbilityDef) return '';
    switch (myAbilityDef.timing) {
      case 'NIGHT_MAFIA':
        return t.timingMafia;
      case 'NIGHT_DOCTOR':
        return t.timingDoctor;
      case 'NIGHT_DETECTIVE':
        return t.timingDetective;
      case 'DAY_VOTE':
        return t.timingDayVote;
      case 'PASSIVE_OR_NIGHT':
        return t.timingPassive;
      default:
        return '';
    }
  }, [myAbilityDef, t]);

  const isCardGlowing = canUseAbilityNow && room.me.abilityId !== 'emergency_self_revive';

  const needsNightConfirm = useMemo(() => {
    if (!isMyActiveTurn || !isCardGlowing || abilityTargetingMode) return false;
    if (room.phase === 'NIGHT_MAFIA' && room.me.myNightTargets.length >= 1) return true;
    if (room.phase === 'NIGHT_DOCTOR') {
      const req =
        room.me.abilityActiveThisPhase && room.me.abilityId === 'double_shield' ? 2 : 1;
      return room.me.myNightTargets.length >= req;
    }
    return false;
  }, [
    isMyActiveTurn,
    isCardGlowing,
    abilityTargetingMode,
    room.phase,
    room.me.myNightTargets.length,
    room.me.abilityActiveThisPhase,
    room.me.abilityId,
  ]);

  const canDetectiveContinue = useMemo(() => {
    if (room.phase !== 'NIGHT_DETECTIVE' || myRole !== 'detective' || !isAlive) return false;
    const req =
      room.me.abilityActiveThisPhase && room.me.abilityId === 'double_investigation' ? 2 : 1;
    return room.me.myNightTargets.length >= req;
  }, [
    room.phase,
    myRole,
    isAlive,
    room.me.abilityActiveThisPhase,
    room.me.abilityId,
    room.me.myNightTargets.length,
  ]);

  const selectedPlayerIds = useMemo(() => {
    if (abilityTargetingMode && abilityTarget1) return [abilityTarget1];
    if (room.phase === 'DAY_VOTE' && room.me.myVoteTargetId && room.me.myVoteTargetId !== 'SKIP') {
      return [room.me.myVoteTargetId];
    }
    return room.me.myNightTargets;
  }, [abilityTargetingMode, abilityTarget1, room.phase, room.me.myVoteTargetId, room.me.myNightTargets]);

  // Global top banner styling (glossy role-colored pill matching mockup)
  const bannerMeta = useMemo((): {
    title: string;
    color: string;
    bg: string;
    roleIcon?: Role;
  } => {
    switch (room.phase) {
      case 'ROLE_REVEAL':
        return {
          title: t.yourRoleIs,
          color: myRole ? ROLE_COLORS[myRole].hex : '#FACC15',
          bg: 'linear-gradient(90deg, #3B1E80 0%, #5B2EC4 100%)',
          roleIcon: myRole ?? undefined,
        };
      case 'NIGHT_SLEEP':
        return {
          title: t.sleepingTitle,
          color: '#A855F7',
          bg: 'linear-gradient(90deg, #2D1A66 0%, #4E2B9E 100%)',
        };
      case 'NIGHT_MAFIA':
        return {
          title: t.mafiaTurn,
          color: '#FF3B5C',
          bg: 'linear-gradient(90deg, #B91C3C 0%, #FF3B5C 100%)',
          roleIcon: 'mafia',
        };
      case 'NIGHT_DOCTOR':
        return {
          title: t.doctorTurn,
          color: '#22E58B',
          bg: 'linear-gradient(90deg, #15803D 0%, #22C55E 100%)',
          roleIcon: 'doctor',
        };
      case 'NIGHT_DETECTIVE':
        return {
          title: t.detectiveTurn,
          color: '#38B6FF',
          bg: 'linear-gradient(90deg, #1D4ED8 0%, #38B6FF 100%)',
          roleIcon: 'detective',
        };
      case 'DAY_ANNOUNCE':
        return {
          title: t.dayAnnounce,
          color: '#FACC15',
          bg: 'linear-gradient(90deg, #A16207 0%, #EAB308 100%)',
        };
      case 'DAY_VOTE':
        return {
          title: t.votingTimeTitle,
          color: '#FACC15',
          bg: 'linear-gradient(90deg, #B45309 0%, #F59E0B 100%)',
        };
      case 'GAME_OVER':
        return {
          title: room.winner === 'mafia' ? t.mafiaWin : t.civiliansWin,
          color: room.winner === 'mafia' ? '#FF3B5C' : '#22E58B',
          bg:
            room.winner === 'mafia'
              ? 'linear-gradient(90deg, #B91C3C 0%, #FF3B5C 100%)'
              : 'linear-gradient(90deg, #15803D 0%, #22C55E 100%)',
        };
      default:
        return {
          title: t.appName,
          color: '#A855F7',
          bg: 'linear-gradient(90deg, #3B1E80 0%, #5B2EC4 100%)',
        };
    }
  }, [room.phase, room.winner, myRole, t]);

  // Accent color for glowing target portrait cards (matches current turn's signature neon color)
  const targetGlowHex = useMemo(() => {
    if (abilityTargetingMode && myAbilityDef) return myAbilityDef.accentHex;
    if (room.phase === 'NIGHT_MAFIA') return '#FF3B5C';
    if (room.phase === 'NIGHT_DOCTOR') return '#22E58B';
    if (room.phase === 'NIGHT_DETECTIVE') return '#38B6FF';
    return '#FACC15';
  }, [abilityTargetingMode, myAbilityDef, room.phase]);

  const handlePlayerPick = async (targetId: string) => {
    if (!isMyActiveTurn) return;
    const target = room.players.find((p) => p.id === targetId);
    if (!target || !target.alive) return;

    setFeedbackError(null);

    if (abilityTargetingMode && myAbilityDef) {
      if (!myAbilityDef.allowSelfTarget && targetId === room.me.playerId) {
        audioSynth.error();
        return;
      }
      if (myAbilityDef.targetCount === 1) {
        const err = await onActivateAbility(targetId);
        if (err) {
          setFeedbackError(err);
          audioSynth.error();
        } else {
          setAbilityTargetingMode(false);
          setAbilityTarget1(null);
        }
        return;
      }
      if (myAbilityDef.targetCount === 2) {
        if (!abilityTarget1) {
          audioSynth.click();
          setAbilityTarget1(targetId);
          return;
        }
        if (abilityTarget1 === targetId) {
          audioSynth.error();
          return;
        }
        const err = await onActivateAbility(abilityTarget1, targetId);
        if (err) {
          setFeedbackError(err);
          audioSynth.error();
        } else {
          setAbilityTargetingMode(false);
          setAbilityTarget1(null);
        }
        return;
      }
    }

    if (room.phase === 'DAY_VOTE') {
      if (targetId === room.me.playerId) return;
      audioSynth.confirm();
      const err = await onSubmitDayVote(targetId);
      if (err) {
        setFeedbackError(err);
        audioSynth.error();
      }
    } else {
      audioSynth.confirm();
      const err = await onSubmitNightTarget(targetId);
      if (err) {
        setFeedbackError(err);
        audioSynth.error();
      }
    }
  };

  const handleAbilityButtonClick = async () => {
    if (!canUseAbilityNow || !myAbilityDef) return;
    setFeedbackError(null);
    if (abilityTargetingMode) {
      setAbilityTargetingMode(false);
      setAbilityTarget1(null);
      audioSynth.click();
      return;
    }
    if (myAbilityDef.targetCount === 0) {
      const err = await onActivateAbility();
      if (err) {
        setFeedbackError(err);
        audioSynth.error();
      }
    } else {
      audioSynth.click();
      setAbilityTargetingMode(true);
      setAbilityTarget1(null);
    }
  };

  const formatAnnouncement = (ev: AnnouncementEvent): string => {
    switch (ev.key) {
      case 'night_killed':
        return formatTemplate(t.announcements.night_killed, { name: ev.playerName ?? '' });
      case 'night_saved':
        return t.announcements.night_saved;
      case 'night_quiet':
        return t.announcements.night_quiet;
      case 'day_eliminated':
        return formatTemplate(t.announcements.day_eliminated, { name: ev.playerName ?? '' });
      case 'day_tie':
        return t.announcements.day_tie;
      case 'day_skipped':
        return t.announcements.day_skipped;
      case 'last_will_reveal':
        return formatTemplate(
          ev.isMafia ? t.announcements.last_will_reveal_mafia : t.announcements.last_will_reveal_clean,
          { name: ev.playerName ?? '' },
        );
      case 'public_innocent':
        return formatTemplate(t.announcements.public_innocent, { name: ev.playerName ?? '' });
      case 'player_silenced':
        return formatTemplate(t.announcements.player_silenced, { name: ev.playerName ?? '' });
      case 'time_frozen':
        return t.announcements.time_frozen;
      default:
        return '';
    }
  };

  const selectableTargets = room.players.filter((p) => {
    if (!p.alive) return false;
    if (abilityTargetingMode && myAbilityDef) {
      return myAbilityDef.allowSelfTarget || p.id !== room.me.playerId;
    }
    if (room.phase === 'NIGHT_MAFIA') return p.revealedRole !== 'mafia';
    if (room.phase === 'NIGHT_DOCTOR') return true;
    if (room.phase === 'NIGHT_DETECTIVE') return p.id !== room.me.playerId;
    if (room.phase === 'DAY_VOTE') return p.id !== room.me.playerId;
    return false;
  });

  const actionPrompt = (() => {
    if (abilityTargetingMode && myAbilityDef) {
      if (myAbilityDef.targetCount === 2) {
        return abilityTarget1 ? t.pickRedirectTo : t.pickVictimVote;
      }
      return t.selectAbilityTarget;
    }
    if (room.phase === 'NIGHT_MAFIA') {
      return room.me.mafiaPartnerIds.length > 0 ? t.mafiaPartnerNote : t.mafiaPrompt;
    }
    if (room.phase === 'NIGHT_DOCTOR') {
      return room.me.abilityActiveThisPhase && room.me.abilityId === 'double_shield'
        ? t.doctorDoublePrompt
        : t.doctorPrompt;
    }
    if (room.phase === 'NIGHT_DETECTIVE') {
      return room.me.abilityActiveThisPhase && room.me.abilityId === 'double_investigation'
        ? t.detectiveDoublePrompt
        : t.detectivePrompt;
    }
    return t.dayVotePrompt;
  })();

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden select-none">
      {/* 3D World Canvas (Isolated full-bleed background) */}
      <GameSceneCanvas
        room={room}
        isMeSleeping={isMeSleeping}
        canPickPlayer={isMyActiveTurn && !isMeSleeping}
        selectedPlayerIds={selectedPlayerIds}
        onSelectPlayer={(id) => {
          void handlePlayerPick(id);
        }}
      />

      {/* Sleeping Eyelid-Closing Vignette Curtains */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-10 transition-opacity duration-700"
        style={{
          opacity: isMeSleeping ? 1 : 0,
        }}
      >
        <div
          className="absolute inset-x-0 top-0 transition-transform duration-700"
          style={{
            height: '52%',
            background: 'linear-gradient(180deg, #060312 0%, rgba(12, 7, 28, 0.9) 70%, rgba(12, 7, 28, 0) 100%)',
            transform: isMeSleeping ? 'translateY(0)' : 'translateY(-100%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 transition-transform duration-700"
          style={{
            height: '52%',
            background: 'linear-gradient(0deg, #060312 0%, rgba(12, 7, 28, 0.9) 70%, rgba(12, 7, 28, 0) 100%)',
            transform: isMeSleeping ? 'translateY(0)' : 'translateY(100%)',
          }}
        />
      </div>

      {/* Main HUD Overlay (pointer-events-none so 3D canvas clicks pass right through) */}
      <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
        {/* TOP HUD BAR: Responsive across desktop & 390px mobile without clipping */}
        <div className="w-full max-w-[1440px] mx-auto flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
            {/* Start: Alive Players Chip + Private Role Badge */}
            <div className="pointer-events-auto flex items-center gap-2">
              <div className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl bg-[#18113A]/95 border border-purple-300/30 inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-white shadow-lg tabular-nums">
                <Users className="w-4 h-4 text-purple-200" />
                <span>
                  {aliveCount}/{room.players.length}
                </span>
              </div>

              {myRole && (
                <div
                  className="px-2.5 sm:px-3 py-1.5 rounded-2xl bg-[#18113A]/95 border-2 flex items-center gap-2 shadow-lg"
                  style={{ borderColor: ROLE_COLORS[myRole].border }}
                >
                  <RoleIconSvg role={myRole} className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  <div className="leading-tight text-start">
                    <div className="text-[10px] text-purple-200/75">
                      {t.roundLabel} {room.roundNumber}
                    </div>
                    <div
                      className="font-display text-xs sm:text-sm font-extrabold"
                      style={{ color: ROLE_COLORS[myRole].text }}
                    >
                      {t.roles[myRole].name}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile-only utility buttons on row 1 */}
            <div className="pointer-events-auto flex sm:hidden items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  audioSynth.click();
                  onOpenRules();
                }}
                aria-label={t.rulesAndCards}
                className="w-10 h-10 rounded-xl bg-[#1A1340]/95 hover:bg-[#2A205C] border border-purple-300/30 text-[#FACC15] flex items-center justify-center"
              >
                <BookOpen className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={muted ? t.soundOff : t.soundOn}
                className="w-10 h-10 rounded-xl bg-[#1A1340]/95 hover:bg-[#2A205C] border border-purple-300/30 text-white flex items-center justify-center"
              >
                {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#22E58B]" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  audioSynth.click();
                  onLeave();
                }}
                aria-label={t.leaveMatch}
                className="w-10 h-10 rounded-xl bg-[#2E1629]/95 hover:bg-[#471D3C] border border-rose-500/40 text-rose-300 flex items-center justify-center"
              >
                <LogOut className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>

          {/* Center: Vibrant Role-Colored Turn Banner matching Mockup */}
          <div
            data-testid="phase-banner"
            className="pointer-events-auto self-center px-5 sm:px-7 py-2 sm:py-2.5 rounded-full border-2 flex items-center gap-2.5 sm:gap-3 shadow-2xl"
            style={{
              background: bannerMeta.bg,
              borderColor: 'rgba(255,255,255,0.45)',
              boxShadow: `0 8px 30px ${bannerMeta.color}65`,
            }}
          >
            {bannerMeta.roleIcon && (
              <RoleIconSvg role={bannerMeta.roleIcon} className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 drop-shadow" />
            )}
            <span className="font-display text-sm sm:text-xl font-extrabold text-white whitespace-nowrap drop-shadow">
              {bannerMeta.title}
            </span>
            {room.phase !== 'GAME_OVER' && (
              <span className="px-2.5 py-0.5 rounded-full bg-black/30 text-white font-mono text-xs sm:text-base font-extrabold inline-flex items-center gap-1 tabular-nums">
                <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>
                  {secondsLeft}
                  {t.secondsShort}
                </span>
              </span>
            )}
          </div>

          {/* Desktop-only End: Rules, Audio, Leave */}
          <div className="pointer-events-auto hidden sm:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                audioSynth.click();
                onOpenRules();
              }}
              aria-label={t.rulesAndCards}
              className="w-11 h-11 rounded-2xl bg-[#1A1340]/95 hover:bg-[#2A205C] border border-purple-300/30 text-[#FACC15] flex items-center justify-center"
            >
              <BookOpen className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? t.soundOff : t.soundOn}
              className="w-11 h-11 rounded-2xl bg-[#1A1340]/95 hover:bg-[#2A205C] border border-purple-300/30 text-white flex items-center justify-center"
            >
              {muted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-[#22E58B]" />}
            </button>
            <button
              type="button"
              onClick={() => {
                audioSynth.click();
                onLeave();
              }}
              aria-label={t.leaveMatch}
              className="w-11 h-11 rounded-2xl bg-[#2E1629]/95 hover:bg-[#471D3C] border border-rose-500/40 text-rose-300 flex items-center justify-center"
            >
              <LogOut className="w-5 h-5 rtl:rotate-180" />
            </button>
          </div>
        </div>

        {/* MIDDLE ZONE: Center Sleeping Emblem, Private Intel Toast, or Dawn Announcements */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 my-2">
          {/* Private Intel Feed */}
          {room.me.privateIntel.length > 0 && !isMeSleeping && room.phase !== 'GAME_OVER' && (
            <div className="pointer-events-auto max-w-md w-full px-4 py-2.5 rounded-2xl bg-[#112445]/95 border-2 border-[#38B6FF] shadow-[0_0_22px_rgba(56,182,255,0.4)] text-center">
              <div className="text-[11px] font-bold text-[#7FD3FF] flex items-center justify-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>{t.intelTitle}</span>
              </div>
              <div className="text-sm font-extrabold text-white mt-0.5">
                {(() => {
                  const latest = room.me.privateIntel[0];
                  if (latest.kind === 'detective_result') {
                    if (latest.exactRole) {
                      return formatTemplate(t.intelExactRole, {
                        name: latest.targetName ?? '',
                        role: t.roles[latest.exactRole].name,
                      });
                    }
                    return formatTemplate(latest.isMafia ? t.intelIsMafia : t.intelNotMafia, {
                      name: latest.targetName ?? '',
                    });
                  }
                  if (latest.kind === 'tracker_result') {
                    return latest.visitedName
                      ? formatTemplate(t.intelTrackerVisited, {
                          name: latest.targetName ?? '',
                          visited: latest.visitedName,
                        })
                      : formatTemplate(t.intelTrackerStayed, { name: latest.targetName ?? '' });
                  }
                  if (latest.kind === 'night_watch') {
                    return latest.alertActive ? t.intelNightWatchDanger : t.intelNightWatchSafe;
                  }
                  return '';
                })()}
              </div>
              {canDetectiveContinue && (
                <div className="mt-2.5 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      audioSynth.confirm();
                      void onContinuePhase();
                    }}
                    className="min-h-[38px] px-4 py-1.5 rounded-xl bg-gradient-to-b from-[#38B6FF] to-[#1D4ED8] text-white font-display text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer"
                  >
                    <span>{t.continueFast}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sleeping Center White Bed Icon + Bold "Sleeping..." matching Mockup */}
          {isMeSleeping && (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="relative drop-shadow-[0_6px_18px_rgba(0,0,0,0.75)]">
                <SleepBedSvg className="w-20 h-16 sm:w-24 sm:h-20" />
                <span className="animate-float-z absolute -top-4 -end-3 font-display text-2xl font-extrabold text-white">
                  Z
                </span>
                <span
                  className="animate-float-z absolute -top-9 end-2 font-display text-lg font-extrabold text-[#FEF08A]"
                  style={{ animationDelay: '0.8s' }}
                >
                  z
                </span>
              </div>
              <div className="font-display text-3xl sm:text-4xl font-extrabold text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
                {t.sleepingTitle}
              </div>
            </div>
          )}

          {/* Dawn / Day Announcement Banner */}
          {room.phase === 'DAY_ANNOUNCE' && room.announcements.length > 0 && (
            <div className="pointer-events-auto max-w-lg w-full p-5 rounded-3xl bg-[#1A1242]/95 border-2 border-[#FACC15] shadow-[0_0_32px_rgba(250,204,21,0.35)] space-y-2 text-center animate-card-pop">
              {room.announcements.map((ev) => (
                <div key={ev.id} className="font-display text-lg sm:text-xl font-extrabold text-white">
                  {formatAnnouncement(ev)}
                </div>
              ))}
            </div>
          )}

          {/* Eliminated Spectating Notice */}
          {!isAlive && room.phase !== 'GAME_OVER' && (
            <div className="px-4 py-2 rounded-full bg-[#2A1428]/95 border border-rose-500/55 text-xs sm:text-sm font-bold text-rose-200 shadow-lg">
              {t.youAreEliminated} · {t.spectating}
            </div>
          )}
        </div>

        {/* BOTTOM DOCK: Sleeping Message OR Glowing Portrait Target Cards + Ability Card Tray */}
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-2.5 mb-14 sm:mb-0">
          {isMeSleeping ? (
            <div className="px-6 py-2.5 rounded-full bg-[#150E36]/95 border border-purple-300/35 text-sm sm:text-base font-bold text-purple-100 shadow-xl">
              {t.everyoneAsleep}
            </div>
          ) : isMyActiveTurn && room.phase !== 'GAME_OVER' ? (
            <div className="pointer-events-auto w-full rounded-3xl bg-[#171038]/94 border-2 border-purple-300/30 p-3 sm:p-4 shadow-2xl space-y-3">
              {/* Action Prompt + Confirm Button (when card usable) + Feedback Error */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-display text-sm sm:text-base font-extrabold text-white text-start">
                  {actionPrompt}
                  {mePlayer?.silenced && room.phase === 'DAY_VOTE' && (
                    <span className="ms-2 text-[#FF6B84]">({t.silencedNotice})</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {needsNightConfirm && (
                    <button
                      type="button"
                      onClick={() => {
                        audioSynth.confirm();
                        void onConfirmNightAction();
                      }}
                      className="min-h-[38px] px-4 py-1.5 rounded-xl bg-gradient-to-b from-[#22E58B] to-[#15803D] text-[#0A1F14] font-display text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 shadow-lg hover:brightness-110 cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>{t.confirmTarget}</span>
                    </button>
                  )}

                  {feedbackError && (
                    <span role="alert" className="text-xs font-bold text-[#FF6B84]">
                      {t.errors[feedbackError]}
                    </span>
                  )}
                </div>
              </div>

              {/* Glowing Role-Bordered Target Portrait Cards matching Mockup */}
              <div className="flex items-stretch gap-2.5 overflow-x-auto mafia-scroll pb-1">
                {selectableTargets.map((p) => {
                  const isPicked = selectedPlayerIds.includes(p.id);
                  const votes = room.voteTallies[p.id] ?? 0;
                  const partnerSelected = Object.entries(room.me.mafiaSelections).some(
                    ([mId, tId]) => mId !== room.me.playerId && tId === p.id,
                  );

                  const borderCol = isPicked
                    ? '#FACC15'
                    : partnerSelected
                      ? '#FF3B5C'
                      : targetGlowHex;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => void handlePlayerPick(p.id)}
                      className="min-w-[102px] sm:min-w-[116px] px-2.5 py-2 rounded-2xl border-2 flex flex-col items-center justify-between gap-1 transition-all shrink-0 hover:-translate-y-0.5 cursor-pointer"
                      style={{
                        background: isPicked
                          ? 'linear-gradient(180deg, #3D2885 0%, #241759 100%)'
                          : 'linear-gradient(180deg, #2B1A5C 0%, #19103D 100%)',
                        borderColor: borderCol,
                        boxShadow: isPicked
                          ? '0 0 22px rgba(250, 204, 21, 0.65)'
                          : `0 0 16px ${borderCol}55`,
                      }}
                    >
                      <div className="relative">
                        <ChibiPortraitSvg
                          appearance={p.appearance}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#130C2E]/70"
                        />
                        {isPicked && (
                          <span className="w-6 h-6 rounded-full bg-[#FACC15] text-[#181036] flex items-center justify-center absolute -top-1 -end-1 shadow-md">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </span>
                        )}
                        {p.publiclyCleared && (
                          <span className="w-5 h-5 rounded-full bg-[#22E58B] text-[#0D2118] flex items-center justify-center absolute -top-1 -start-1 shadow">
                            <Shield className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div className="w-full text-center leading-tight">
                        <div className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[96px]">
                          {p.name}
                        </div>
                        {votes > 0 && (
                          <div className="text-[11px] font-extrabold text-[#FACC15] tabular-nums">
                            {votes}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Skip Vote Button (Day Vote only if enabled) */}
                {room.phase === 'DAY_VOTE' && room.settings.skipVoteEnabled && !abilityTargetingMode && (
                  <button
                    type="button"
                    onClick={() => {
                      audioSynth.confirm();
                      void onSubmitDayVote('SKIP');
                    }}
                    className={`min-w-[104px] px-4 py-2 rounded-2xl border-2 font-display text-sm font-extrabold flex flex-col items-center justify-center gap-1.5 transition-all shrink-0 whitespace-nowrap ${
                      room.me.myVoteTargetId === 'SKIP'
                        ? 'bg-[#FACC15] border-[#FEF08A] text-[#181036] shadow-[0_0_20px_rgba(250,204,21,0.55)]'
                        : 'bg-[#281E54] border-purple-300/45 hover:border-[#FACC15] text-purple-100'
                    }`}
                  >
                    <SkipForward className="w-6 h-6" />
                    <span>{t.skipVote}</span>
                    {room.skipVotes > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-black/25 text-xs tabular-nums">
                        {room.skipVotes}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Glowing Ability Card Action Dock */}
              {myAbilityDef && room.me.abilityId && (
                <div
                  className="p-2.5 sm:p-3 rounded-2xl border-2 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3"
                  style={{
                    backgroundColor: room.me.abilityUsed
                      ? 'rgba(30, 24, 58, 0.75)'
                      : ROLE_COLORS[myAbilityDef.role].softBg,
                    borderColor: room.me.abilityUsed
                      ? 'rgba(148, 163, 184, 0.25)'
                      : ROLE_COLORS[myAbilityDef.role].hex,
                    boxShadow: room.me.abilityUsed
                      ? 'none'
                      : `0 0 18px ${ROLE_COLORS[myAbilityDef.role].hex}40`,
                  }}
                >
                  <div className="flex items-center gap-2.5 text-start min-w-0">
                    <span
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: `${myAbilityDef.accentHex}28`,
                        borderColor: `${myAbilityDef.accentHex}88`,
                      }}
                    >
                      <RoleIconSvg role={myAbilityDef.role} className="w-7 h-7" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-extrabold text-white truncate">
                          {t.abilities[room.me.abilityId].name}
                        </span>
                        <span
                          className="text-[11px] font-bold whitespace-nowrap"
                          style={{ color: ROLE_COLORS[myAbilityDef.role].text }}
                        >
                          {room.me.abilityUsed
                            ? t.cardUsed
                            : room.me.abilityId === 'emergency_self_revive'
                              ? t.cardPassiveArmed
                              : t.abilities[room.me.abilityId].shortHint}
                        </span>
                      </div>
                      <p className="text-xs text-purple-100/90 line-clamp-1">
                        {t.abilities[room.me.abilityId].desc}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canUseAbilityNow}
                    onClick={() => void handleAbilityButtonClick()}
                    className={`min-h-[42px] px-4 py-2 rounded-xl font-display text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all shrink-0 inline-flex items-center gap-1.5 ${
                      abilityTargetingMode
                        ? 'bg-rose-500 text-white'
                        : canUseAbilityNow
                          ? 'bg-gradient-to-b from-[#FDE047] to-[#F59E0B] text-[#181036] hover:brightness-105 shadow-md cursor-pointer'
                          : 'bg-white/10 text-purple-300/50 cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>
                      {abilityTargetingMode
                        ? t.cancelAbility
                        : room.me.abilityUsed
                          ? t.cardUsed
                          : t.activateCard}
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* PERSISTENT THUMB-FRIENDLY "MY CARD" BUTTON (Bottom-End Corner, Active Glow ONLY when Usable Now) */}
      {room.phase !== 'ROLE_REVEAL' && room.phase !== 'GAME_OVER' && myRole && (
        <div className="fixed bottom-3 end-3 sm:bottom-5 sm:end-5 z-30 pointer-events-auto">
          <button
            type="button"
            data-testid="my-card-button"
            onClick={() => {
              audioSynth.click();
              setMyCardModalOpen(true);
            }}
            className={`relative min-h-[48px] px-3.5 sm:px-4 py-2 rounded-2xl border-2 flex items-center gap-2 transition-transform cursor-pointer hover:scale-[1.03] active:scale-[0.98] ${
              isCardGlowing ? 'animate-bounce' : ''
            }`}
            style={{
              background: isCardGlowing
                ? `linear-gradient(135deg, ${ROLE_COLORS[myRole].hex} 0%, #241654 100%)`
                : 'rgba(24, 17, 58, 0.94)',
              borderColor: isCardGlowing
                ? '#FEF08A'
                : room.me.abilityUsed || !myAbilityDef
                  ? 'rgba(148, 163, 184, 0.35)'
                  : ROLE_COLORS[myRole].border,
              boxShadow: isCardGlowing
                ? `0 0 28px ${ROLE_COLORS[myRole].hex}, 0 0 12px rgba(250, 204, 21, 0.65)`
                : '0 8px 22px rgba(6, 4, 18, 0.6)',
              animationDuration: isCardGlowing ? '2.2s' : undefined,
            }}
          >
            {/* Shimmer Halo Ring strictly when card is actively usable right now */}
            {isCardGlowing && (
              <span
                aria-hidden="true"
                className="absolute -inset-1 rounded-2xl border-2 pointer-events-none animate-pulse"
                style={{
                  borderColor: ROLE_COLORS[myRole].hex,
                  boxShadow: `0 0 18px ${ROLE_COLORS[myRole].hex}`,
                }}
              />
            )}

            {/* "READY!" / "جاهز!" badge when card is usable right now */}
            {isCardGlowing && (
              <span className="absolute -top-2.5 -start-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FDE047] to-[#F59E0B] text-[#181036] font-display text-[10px] font-extrabold shadow-md tracking-wide">
                {t.myCardReadyBadge}
              </span>
            )}

            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor:
                  myAbilityDef && !room.me.abilityUsed
                    ? `${ROLE_COLORS[myRole].hex}30`
                    : 'rgba(255,255,255,0.08)',
                borderColor:
                  myAbilityDef && !room.me.abilityUsed
                    ? ROLE_COLORS[myRole].border
                    : 'rgba(255,255,255,0.18)',
              }}
            >
              <RoleIconSvg role={myRole} className="w-5 h-5" />
            </span>

            <div className="text-start leading-tight">
              <div className="font-display text-xs sm:text-sm font-extrabold text-white whitespace-nowrap">
                {t.myCardButton}
              </div>
              <div
                className="text-[10px] font-bold truncate max-w-[110px]"
                style={{
                  color: isCardGlowing
                    ? '#FEF08A'
                    : room.me.abilityUsed
                      ? '#94A3B8'
                      : ROLE_COLORS[myRole].text,
                }}
              >
                {room.me.abilityId
                  ? room.me.abilityUsed
                    ? t.cardStatusUsed
                    : t.abilities[room.me.abilityId].name
                  : t.noAbilityCard}
              </div>
            </div>
          </button>
        </div>
      )}

      {/* MY CARD INSPECTION & ACTIVATION MODAL */}
      {myCardModalOpen && myRole && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09051A]/85"
          role="dialog"
          aria-modal="true"
          aria-label={t.myCardButton}
          onClick={() => setMyCardModalOpen(false)}
        >
          <div
            className="w-full max-w-md p-5 sm:p-6 rounded-3xl bg-[#1A133C] border-2 shadow-2xl space-y-4 animate-card-pop"
            style={{
              borderColor: ROLE_COLORS[myRole].hex,
              boxShadow: `0 0 38px ${ROLE_COLORS[myRole].hex}55`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <RoleIconSvg role={myRole} className="w-7 h-7" />
                <h2 className="font-display text-xl font-extrabold text-white">
                  {t.myCardButton}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  audioSynth.click();
                  setMyCardModalOpen(false);
                }}
                aria-label={t.close}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {myAbilityDef && room.me.abilityId ? (
              <>
                {/* Glowing Card Preview */}
                <GlowingAbilityCard
                  role={myAbilityDef.role}
                  headerLabel={t.roles[myAbilityDef.role].name}
                  title={t.abilities[room.me.abilityId].name}
                  description={t.abilities[room.me.abilityId].desc}
                  badge={t.abilities[room.me.abilityId].shortHint}
                />

                {/* Explicit "When to use" Timing & Current Status */}
                <div className="p-3.5 rounded-2xl bg-[#120C2B] border border-purple-400/25 space-y-2.5 text-start">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-purple-200/80 inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#FACC15]" />
                      <span>{t.whenToUseLabel}</span>
                    </span>
                    <span className="font-extrabold text-white">{myCardTimingLabel}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-purple-400/15">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5 ${
                        room.me.abilityUsed
                          ? 'bg-slate-700/70 text-slate-300'
                          : room.me.abilityId === 'emergency_self_revive'
                            ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/45'
                            : canUseAbilityNow
                              ? 'bg-emerald-500/25 text-[#4DF2A6] border border-emerald-400/60'
                              : 'bg-purple-500/20 text-purple-200 border border-purple-400/35'
                      }`}
                    >
                      {room.me.abilityUsed ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{t.cardStatusUsed}</span>
                        </>
                      ) : room.me.abilityId === 'emergency_self_revive' ? (
                        <>
                          <Shield className="w-3.5 h-3.5" />
                          <span>{t.cardPassiveArmed}</span>
                        </>
                      ) : canUseAbilityNow ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{t.cardStatusReadyNow}</span>
                        </>
                      ) : (
                        <>
                          <Timer className="w-3.5 h-3.5" />
                          <span>
                            {formatTemplate(t.cardStatusWaitFor, { phase: myCardTimingLabel })}
                          </span>
                        </>
                      )}
                    </span>

                    {canUseAbilityNow && room.me.abilityId !== 'emergency_self_revive' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMyCardModalOpen(false);
                          void handleAbilityButtonClick();
                        }}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-gradient-to-b from-[#FDE047] to-[#F59E0B] text-[#181036] font-display text-sm font-extrabold inline-flex items-center gap-1.5 shadow-lg hover:brightness-105 cursor-pointer"
                      >
                        <Zap className="w-4 h-4" />
                        <span>{t.useCardNow}</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-5 rounded-2xl bg-[#140E30] border border-purple-400/25 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-[#FACC15] mx-auto" />
                <p className="text-sm font-bold text-purple-100">{t.noAbilityCard}</p>
                <p className="text-xs text-purple-200/75">{t.roles[myRole].objective}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRIVATE ROLE REVEAL OVERLAY */}
      {room.phase === 'ROLE_REVEAL' && myRole && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#0B071C]/88">
          <div
            className="w-full max-w-md p-6 rounded-3xl bg-[#1A133C] border-2 text-center space-y-4 shadow-2xl animate-card-pop"
            style={{
              borderColor: ROLE_COLORS[myRole].hex,
              boxShadow: `0 0 44px ${ROLE_COLORS[myRole].hex}55`,
            }}
          >
            <div className="text-xs font-extrabold tracking-wider text-purple-200/85">
              {t.yourRoleIs}
            </div>
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center border-2"
                style={{
                  backgroundColor: ROLE_COLORS[myRole].softBg,
                  borderColor: ROLE_COLORS[myRole].border,
                }}
              >
                <RoleIconSvg role={myRole} className="w-13 h-13" />
              </div>
              <h2
                className="font-display text-3xl font-extrabold"
                style={{ color: ROLE_COLORS[myRole].text }}
              >
                {t.roles[myRole].name}
              </h2>
              <p className="text-sm text-purple-100/90 leading-relaxed">
                {t.roles[myRole].objective}
              </p>
            </div>

            {/* Dealt Glowing Ability Card Preview */}
            {room.me.abilityId ? (
              <div className="pt-1">
                <GlowingAbilityCard
                  role={myRole}
                  headerLabel={t.yourAbilityCard}
                  title={t.abilities[room.me.abilityId].name}
                  description={t.abilities[room.me.abilityId].desc}
                  badge={t.abilities[room.me.abilityId].shortHint}
                  compact
                />
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#241B4F] border border-purple-400/30 text-xs text-purple-200/85 inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FACC15]" />
                <span>{t.noAbilityCard}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DRAMATIC FULL-SCREEN GLOWING ABILITY CARD ACTIVATION OVERLAY */}
      {revealedCardEvent && (
        <div
          onClick={() => setRevealedCardEvent(null)}
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#09051A]/78 cursor-pointer"
        >
          <div className="w-full max-w-xs animate-card-pop space-y-2.5 text-center">
            <GlowingAbilityCard
              role={revealedCardEvent.casterRole}
              headerLabel={
                revealedCardEvent.isPublic ? t.abilityActivatedBanner : t.secretEffectBanner
              }
              title={t.abilities[revealedCardEvent.abilityId].name}
              description={t.abilities[revealedCardEvent.abilityId].desc}
              badge={t.roles[revealedCardEvent.casterRole].name}
            />
            {revealedCardEvent.targetName && (
              <div className="inline-block px-4 py-1.5 rounded-full bg-[#1C1442] border border-[#FACC15]/60 text-xs font-extrabold text-[#FEF08A] shadow-lg">
                → {revealedCardEvent.targetName}
                {revealedCardEvent.secondTargetName ? ` → ${revealedCardEvent.secondTargetName}` : ''}
              </div>
            )}
          </div>
        </div>
      )}

      {/* GAME OVER / VICTORY MODAL */}
      {room.phase === 'GAME_OVER' && room.winner && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#09051A]/85"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-xl p-6 rounded-3xl bg-[#1A133C] border-2 shadow-2xl space-y-5 text-center animate-card-pop max-h-[90vh] overflow-y-auto mafia-scroll"
            style={{
              borderColor: room.winner === 'mafia' ? '#FF3B5C' : '#22E58B',
            }}
          >
            <div className="space-y-2">
              <div
                className="w-16 h-16 mx-auto rounded-3xl flex items-center justify-center"
                style={{
                  backgroundColor:
                    room.winner === 'mafia'
                      ? 'rgba(255,59,92,0.22)'
                      : 'rgba(34,229,139,0.22)',
                }}
              >
                <Trophy
                  className="w-9 h-9"
                  style={{ color: room.winner === 'mafia' ? '#FF3B5C' : '#22E58B' }}
                />
              </div>
              <h2
                className="font-display text-3xl sm:text-4xl font-extrabold"
                style={{ color: room.winner === 'mafia' ? '#FF6B84' : '#4DF2A6' }}
              >
                {room.winner === 'mafia' ? t.mafiaWin : t.civiliansWin}
              </h2>
              <p className="text-sm text-purple-200/90">
                {room.winner === 'mafia' ? t.mafiaWinDesc : t.civiliansWinDesc}
              </p>
            </div>

            {/* Revealed Table Roles with Chibi Portraits */}
            <div className="space-y-2 text-start">
              <div className="text-xs font-bold text-purple-200/75">{t.finalRoles}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {room.players.map((p) => {
                  const role = p.revealedRole ?? 'civilian';
                  return (
                    <div
                      key={p.id}
                      className="px-3 py-2 rounded-2xl bg-[#241B4F] border flex items-center justify-between gap-2"
                      style={{ borderColor: ROLE_COLORS[role].border }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ChibiPortraitSvg
                          appearance={p.appearance}
                          className="w-8 h-8 rounded-full bg-[#140E30] shrink-0"
                        />
                        <span className="text-sm font-bold text-white truncate">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-xs">
                        <RoleIconSvg role={role} className="w-4 h-4 shrink-0" />
                        <span className="font-bold" style={{ color: ROLE_COLORS[role].text }}>
                          {t.roles[role].name}
                        </span>
                        <span className={p.alive ? 'text-[#22E58B]' : 'text-rose-400'}>
                          · {p.alive ? t.aliveTag : t.eliminatedTag}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {isHost && (
                <button
                  type="button"
                  data-start="true"
                  onClick={() => {
                    audioSynth.confirm();
                    onPlayAgain();
                  }}
                  className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-gradient-to-b from-[#FDE047] to-[#F59E0B] text-[#181036] font-display text-base font-extrabold inline-flex items-center gap-2 shadow-lg"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t.playAgain}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  audioSynth.click();
                  onReturnToLobby();
                }}
                className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-[#2B1F5C] hover:bg-[#3A2B7A] border border-purple-400/35 text-white font-display text-base font-bold"
              >
                {t.returnToLobby}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

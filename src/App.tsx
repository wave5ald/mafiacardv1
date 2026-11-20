import { useEffect, useRef, useState } from 'react';
import { audioSynth } from './audio/synth';
import { GameHud } from './components/GameHud';
import { HomeScreen } from './components/HomeScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { RulesModal } from './components/RulesModal';
import { HybridNetworkAdapter, NetworkAdapter } from './network/adapter';
import { DEFAULT_APPEARANCE } from './shared/catalog';
import { applyLanguageToDocument, getInitialLanguage } from './shared/i18n';
import {
  CharacterAppearance,
  GamePhase,
  GameSettings,
  Language,
  RoomViewState,
  ValidationErrorPayload,
} from './shared/types';

export default function App() {
  const [lang, setLang] = useState<Language>(() => getInitialLanguage());
  // Mandatory Player Name starts strictly empty (no default pre-fill)
  const [playerName, setPlayerName] = useState<string>('');
  const [muted, setMuted] = useState<boolean>(() => audioSynth.isMuted());
  const [rulesOpen, setRulesOpen] = useState<boolean>(false);
  const [room, setRoom] = useState<RoomViewState | null>(null);

  const adapterRef = useRef<NetworkAdapter | null>(null);
  const prevPhaseRef = useRef<GamePhase | null>(null);
  const autostartTriggeredRef = useRef(false);

  // Apply LTR / RTL direction & lang attribute on mount and language change
  useEffect(() => {
    applyLanguageToDocument(lang);
  }, [lang]);

  // Mirror state machine to document.body.dataset.state for crisp lifecycle & verification
  useEffect(() => {
    if (!room) {
      document.body.dataset.state = 'title';
    } else if (room.phase === 'LOBBY') {
      document.body.dataset.state = 'lobby';
    } else if (room.phase === 'GAME_OVER') {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [room]);

  // Play phase-transition procedural audio cues
  useEffect(() => {
    if (!room) {
      prevPhaseRef.current = null;
      return;
    }
    const prev = prevPhaseRef.current;
    if (prev !== room.phase) {
      prevPhaseRef.current = room.phase;
      if (room.phase === 'NIGHT_SLEEP') {
        audioSynth.sleep();
      } else if (
        room.phase === 'NIGHT_MAFIA' ||
        room.phase === 'NIGHT_DOCTOR' ||
        room.phase === 'NIGHT_DETECTIVE'
      ) {
        audioSynth.roleWake();
      } else if (room.phase === 'DAY_ANNOUNCE') {
        const hasKill = room.announcements.some(
          (a) => a.key === 'night_killed' || a.key === 'day_eliminated',
        );
        const hasSave = room.announcements.some((a) => a.key === 'night_saved');
        if (hasKill) audioSynth.elimination();
        else if (hasSave) audioSynth.saved();
      } else if (room.phase === 'GAME_OVER') {
        audioSynth.victory();
      }
    }
  }, [room]);

  // Mount decoupled NetworkAdapter once
  useEffect(() => {
    const adapter = new HybridNetworkAdapter();
    adapterRef.current = adapter;
    const unsub = adapter.subscribe((nextRoom) => {
      setRoom(nextRoom);
    });

    // Support ?autostart=1 for instant 5-player 3D gameplay verification
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && !autostartTriggeredRef.current) {
      autostartTriggeredRef.current = true;
      setTimeout(async () => {
        const created = await adapter.createRoom('Commander', DEFAULT_APPEARANCE);
        if (created.ok) {
          for (let i = 0; i < 4; i++) {
            await adapter.addBot(lang);
          }
          await adapter.setReady(true);
          await adapter.startGame();
        }
      }, 250);
    }

    return () => {
      unsub();
      adapter.dispose();
      adapterRef.current = null;
    };
  }, []);

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    audioSynth.setMuted(next);
    if (!next) audioSynth.click();
  };

  const handleCreateRoom = async (
    validName: string,
  ): Promise<ValidationErrorPayload['code'] | null> => {
    const res = await adapterRef.current?.createRoom(validName, DEFAULT_APPEARANCE);
    if (!res?.ok) return res?.error ?? 'INVALID_ACTION';
    return null;
  };

  const handleJoinRoom = async (
    roomCode: string,
    validName: string,
  ): Promise<ValidationErrorPayload['code'] | null> => {
    const res = await adapterRef.current?.joinRoom(roomCode, validName, DEFAULT_APPEARANCE);
    if (!res?.ok) return res?.error ?? 'ROOM_NOT_FOUND';
    return null;
  };

  const handleQuickSoloDemo = async (validName: string) => {
    const created = await adapterRef.current?.createRoom(validName, DEFAULT_APPEARANCE);
    if (!created?.ok) return;
    for (let i = 0; i < 4; i++) {
      await adapterRef.current?.addBot(lang);
    }
    await adapterRef.current?.setReady(true);
    await adapterRef.current?.startGame();
  };

  const handleLeave = () => {
    adapterRef.current?.leaveRoom();
    setRoom(null);
  };

  const handleUpdateAppearance = (appearance: CharacterAppearance) => {
    void adapterRef.current?.updateAppearance(appearance);
  };

  const handleToggleReady = (ready: boolean) => {
    void adapterRef.current?.setReady(ready);
  };

  const handleUpdateSettings = (patch: Partial<GameSettings>) => {
    void adapterRef.current?.updateSettings(patch);
  };

  const handleAddBot = () => {
    void adapterRef.current?.addBot(lang);
  };

  const handleRemoveBot = (botId?: string) => {
    void adapterRef.current?.removeBot(botId);
  };

  const handleFillToFive = async () => {
    const needed = Math.max(0, 5 - (room?.players.length ?? 1));
    for (let i = 0; i < needed; i++) {
      await adapterRef.current?.addBot(lang);
    }
  };

  const handleStartGame = async (): Promise<ValidationErrorPayload['code'] | null> => {
    const res = await adapterRef.current?.startGame();
    if (!res?.ok) return res?.error ?? 'INVALID_ACTION';
    return null;
  };

  const handleSubmitNightTarget = async (
    targetId: string,
  ): Promise<ValidationErrorPayload['code'] | null> => {
    const res = await adapterRef.current?.submitNightTarget(targetId);
    if (!res?.ok) return res?.error ?? 'INVALID_ACTION';
    return null;
  };

  const handleConfirmNightAction = async (): Promise<ValidationErrorPayload['code'] | null> => {
    const res = await adapterRef.current?.confirmNightAction();
    if (!res?.ok) return res?.error ?? 'INVALID_ACTION';
    return null;
  };

  const handleContinuePhase = async (): Promise<ValidationErrorPayload['code'] | null> => {
    const res = await adapterRef.current?.continuePhase();
    if (!res?.ok) return res?.error ?? 'INVALID_ACTION';
    return null;
  };

  const handleSubmitDayVote = async (
    targetId: string | 'SKIP',
  ): Promise<ValidationErrorPayload['code'] | null> => {
    const res = await adapterRef.current?.submitDayVote(targetId);
    if (!res?.ok) return res?.error ?? 'INVALID_ACTION';
    return null;
  };

  const handleActivateAbility = async (
    targetId?: string,
    secondTargetId?: string,
  ): Promise<ValidationErrorPayload['code'] | null> => {
    const res = await adapterRef.current?.activateAbility(targetId, secondTargetId);
    if (!res?.ok) return res?.error ?? 'INVALID_ACTION';
    return null;
  };

  const handlePlayAgain = () => {
    void adapterRef.current?.playAgain();
  };

  const handleReturnToLobby = () => {
    void adapterRef.current?.returnToLobby();
  };

  return (
    <div className="min-h-screen w-full">
      {!room ? (
        <HomeScreen
          lang={lang}
          onChangeLang={setLang}
          playerName={playerName}
          onChangePlayerName={setPlayerName}
          muted={muted}
          onToggleMute={handleToggleMute}
          onOpenRules={() => setRulesOpen(true)}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onQuickSoloDemo={handleQuickSoloDemo}
        />
      ) : room.phase === 'LOBBY' ? (
        <LobbyScreen
          lang={lang}
          onChangeLang={setLang}
          room={room}
          muted={muted}
          onToggleMute={handleToggleMute}
          onOpenRules={() => setRulesOpen(true)}
          onLeave={handleLeave}
          onUpdateAppearance={handleUpdateAppearance}
          onToggleReady={handleToggleReady}
          onUpdateSettings={handleUpdateSettings}
          onAddBot={handleAddBot}
          onRemoveBot={handleRemoveBot}
          onFillToFive={handleFillToFive}
          onStartGame={handleStartGame}
        />
      ) : (
        <GameHud
          lang={lang}
          room={room}
          muted={muted}
          onToggleMute={handleToggleMute}
          onOpenRules={() => setRulesOpen(true)}
          onLeave={handleLeave}
          onSubmitNightTarget={handleSubmitNightTarget}
          onConfirmNightAction={handleConfirmNightAction}
          onContinuePhase={handleContinuePhase}
          onSubmitDayVote={handleSubmitDayVote}
          onActivateAbility={handleActivateAbility}
          onPlayAgain={handlePlayAgain}
          onReturnToLobby={handleReturnToLobby}
        />
      )}

      {rulesOpen && <RulesModal lang={lang} onClose={() => setRulesOpen(false)} />}
    </div>
  );
}

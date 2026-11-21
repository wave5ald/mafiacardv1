import { GameRoomEngine } from '../game/engine';
import {
  ActionResponse,
  CharacterAppearance,
  GameSettings,
  Language,
} from '../shared/types';

/**
 * Single place that maps a remote player's command name onto the authoritative
 * engine, so every transport (peer-to-peer, or anything added later) behaves
 * exactly like the Socket.IO server in server.ts.
 */
export function dispatchEngineCommand(
  engine: GameRoomEngine,
  playerId: string,
  action: string,
  payload: Record<string, unknown>,
): ActionResponse<unknown> {
  const p = payload ?? {};
  switch (action) {
    case 'join_room':
      return engine.joinRoom(
        playerId,
        String(p.roomCode ?? ''),
        String(p.playerName ?? ''),
        p.appearance as CharacterAppearance | undefined,
      );
    case 'leave_room':
      engine.leaveRoom(playerId);
      return { ok: true };
    case 'update_appearance':
      return engine.updateAppearance(playerId, p.appearance as CharacterAppearance);
    case 'set_ready':
      return engine.setReady(playerId, Boolean(p.isReady));
    case 'add_bot':
      return engine.addBot(playerId, (p.lang as Language | undefined) ?? 'en');
    case 'remove_bot':
      return engine.removeBot(playerId, p.botId as string | undefined);
    case 'update_settings':
      return engine.updateSettings(playerId, (p.patch as Partial<GameSettings> | undefined) ?? {});
    case 'start_game':
      return engine.startGame(playerId);
    case 'submit_night_target':
      return engine.submitNightTarget(playerId, String(p.targetId ?? ''));
    case 'confirm_night_action':
      return engine.confirmNightAction(playerId);
    case 'continue_phase':
      return engine.continuePhase(playerId);
    case 'submit_day_vote':
      return engine.submitDayVote(playerId, String(p.targetId ?? '') as string | 'SKIP');
    case 'activate_ability':
      return engine.activateAbility(
        playerId,
        p.targetId as string | undefined,
        p.secondTargetId as string | undefined,
      );
    case 'play_again':
      return engine.playAgain(playerId);
    case 'return_to_lobby':
      return engine.returnToLobby(playerId);
    default:
      return { ok: false, error: 'INVALID_ACTION' };
  }
}

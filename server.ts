import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { GameRoomEngine } from './src/game/engine';
import { CharacterAppearance, GameSettings, Language } from './src/shared/types';

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function bootstrap() {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
    transports: ['websocket', 'polling'],
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'mafiacards' });
  });

  const engine = new GameRoomEngine((_roomCode, viewsByPlayerId) => {
    for (const [socketId, view] of viewsByPlayerId.entries()) {
      io.to(socketId).emit('room_state', view);
    }
  });

  io.on('connection', (socket) => {
    socket.on(
      'create_room',
      (
        payload: { playerName: string; appearance?: CharacterAppearance },
        cb?: (res: unknown) => void,
      ) => {
        const res = engine.createRoom(socket.id, payload?.playerName, payload?.appearance);
        cb?.(res);
      },
    );

    socket.on(
      'join_room',
      (
        payload: { roomCode: string; playerName: string; appearance?: CharacterAppearance },
        cb?: (res: unknown) => void,
      ) => {
        const res = engine.joinRoom(
          socket.id,
          payload?.roomCode,
          payload?.playerName,
          payload?.appearance,
        );
        cb?.(res);
      },
    );

    socket.on('leave_room', () => {
      engine.leaveRoom(socket.id);
    });

    socket.on('add_bot', (payload: { lang?: Language }, cb?: (res: unknown) => void) => {
      cb?.(engine.addBot(socket.id, payload?.lang ?? 'en'));
    });

    socket.on('remove_bot', (payload: { botId?: string }, cb?: (res: unknown) => void) => {
      cb?.(engine.removeBot(socket.id, payload?.botId));
    });

    socket.on(
      'update_appearance',
      (payload: { appearance: CharacterAppearance }, cb?: (res: unknown) => void) => {
        cb?.(engine.updateAppearance(socket.id, payload.appearance));
      },
    );

    socket.on('set_ready', (payload: { isReady: boolean }, cb?: (res: unknown) => void) => {
      cb?.(engine.setReady(socket.id, Boolean(payload?.isReady)));
    });

    socket.on(
      'update_settings',
      (payload: { patch: Partial<GameSettings> }, cb?: (res: unknown) => void) => {
        cb?.(engine.updateSettings(socket.id, payload?.patch ?? {}));
      },
    );

    socket.on('start_game', (_payload: unknown, cb?: (res: unknown) => void) => {
      cb?.(engine.startGame(socket.id));
    });

    socket.on(
      'submit_night_target',
      (payload: { targetId: string }, cb?: (res: unknown) => void) => {
        cb?.(engine.submitNightTarget(socket.id, payload?.targetId));
      },
    );

    socket.on('confirm_night_action', (_payload: unknown, cb?: (res: unknown) => void) => {
      cb?.(engine.confirmNightAction(socket.id));
    });

    socket.on('continue_phase', (_payload: unknown, cb?: (res: unknown) => void) => {
      cb?.(engine.continuePhase(socket.id));
    });

    socket.on(
      'submit_day_vote',
      (payload: { targetId: string | 'SKIP' }, cb?: (res: unknown) => void) => {
        cb?.(engine.submitDayVote(socket.id, payload?.targetId));
      },
    );

    socket.on(
      'activate_ability',
      (
        payload: { targetId?: string; secondTargetId?: string },
        cb?: (res: unknown) => void,
      ) => {
        cb?.(engine.activateAbility(socket.id, payload?.targetId, payload?.secondTargetId));
      },
    );

    socket.on('play_again', (_payload: unknown, cb?: (res: unknown) => void) => {
      cb?.(engine.playAgain(socket.id));
    });

    socket.on('return_to_lobby', (_payload: unknown, cb?: (res: unknown) => void) => {
      cb?.(engine.returnToLobby(socket.id));
    });

    socket.on('disconnect', () => {
      engine.leaveRoom(socket.id);
    });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`MafiaCards server listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start MafiaCards server:', err);
  process.exit(1);
});

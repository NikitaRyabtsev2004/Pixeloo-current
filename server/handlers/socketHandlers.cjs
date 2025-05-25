const { logger } = require('../utils/libs/logger.cjs');
const { handlePixelDraw } = require('../utils/pixel/handlePixelDraw.cjs');
const { sendUserPixelCount } = require('../utils/pixel/sendUserPixelCount.cjs');
const {
  getMaxPixelCount,
  getUserData,
  getUserName,
  getCanvasStatus,
  updateMaxPixelCount,
  setDrawPixel,
  getLeaderboard,
  getPixelColor,
  getPlacedPixels,
  getPlacedPixelsCanvas1,
  getUserAchievement,
  getUsernameData,
  getBattleCanvasStatus,
} = require('../database/dbQueries.cjs');
const {
  checkAndEmitPixelStatus,
} = require('../utils/pixel/checkAndEmitPixelStatus.cjs');
const db = require('../database/dbSetup.cjs');

function handleSocketEvents(socket, io, onlineUsers, battleManager) {
  let uniqueIdentifier = socket.handshake.auth.uniqueIdentifier;
  let currentRoute;

  socket.emit('server-status', { status: 'online' });

  setInterval(() => {
    checkAndEmitPixelStatus(socket, uniqueIdentifier);
    getMaxPixelCount(uniqueIdentifier, socket);
  }, 5000);

  socket.on('check-server-status', (callback) => {
    callback({ status: 'online' });
  });

  socket.on('client-info', (data) => {
    uniqueIdentifier = data.uniqueIdentifier;
    getUserData(uniqueIdentifier, socket);
    sendUserPixelCount(socket, uniqueIdentifier);
  });

  const getTableName = (route, uniqueIdentifier) => {
    switch (route) {
      case '/canvas-1':
        return 'Canvas';
      case '/canvas-2':
        return 'Canvas2';
      case '/canvas-3':
        return 'Canvas3';
      case '/single-player-game':
        return `SinglePlayer_${uniqueIdentifier}`;
      default:
        return null;
    }
  };

  socket.on('get-username', (data, callback) => {
    const { x, y } = data;
    const tableName = getTableName(currentRoute, uniqueIdentifier);
    getUserName(tableName, callback, x, y, uniqueIdentifier);
  });

  socket.on('get-pixel-color', (data, callback) => {
    const { x, y } = data;
    const tableName = getTableName(currentRoute, uniqueIdentifier);
    getPixelColor(tableName, callback, x, y);
  });

  socket.on('route', (route) => {
    currentRoute = route;
    if (route.startsWith('/battle/')) {
      const gameId = route.split('/')[2];
      const game = battleManager.games[gameId];
      const playerId = uniqueIdentifier;
      console.log(`Попытка подключения к игре ${gameId} игроком ${playerId}, сокет: ${socket.id}`);
      if (game && game.players.includes(playerId)) {
        game.playerSockets = game.playerSockets || {};
        game.playerSockets[playerId] = socket;
        console.log(`Сокет ${socket.id} обновлён для игрока ${playerId} в игре ${gameId}`);
        
        const playerIndex = game.players.indexOf(playerId) + 1;
        const tableName = `P${playerIndex}_${gameId}`;
        
        db.get(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
          [tableName],
          (err, row) => {
            if (err) {
              logger.error(`Ошибка проверки таблицы ${tableName}: ${err.message}`);
              return;
            }
            if (!row) {
              db.run(
                `CREATE TABLE ${tableName} (x INTEGER, y INTEGER, color TEXT, userId TEXT, PRIMARY KEY (x, y))`,
                (err) => {
                  if (err) {
                    logger.error(`Ошибка создания таблицы ${tableName}: ${err.message}`);
                  } else {
                    logger.info(`Таблица ${tableName} создана для игры ${gameId}`);
                    getBattleCanvasStatus(tableName, socket);
                  }
                }
              );
            } else {
              getBattleCanvasStatus(tableName, socket);
            }
          }
        );
        socket.emit('access-granted', { gameId }); // Подтверждаем доступ
      } else {
        console.log(`Игрок ${playerId} не найден в игре ${gameId}`);
        socket.emit('access-denied', { message: 'Вы не участник этой игры' });
      }
    } else {
      const canvasName = getTableName(route, uniqueIdentifier);
      if (canvasName) {
        getCanvasStatus(canvasName, socket, route);
      }
    }
  });

  socket.on('get-max-pixel-count', () => {
    getMaxPixelCount(uniqueIdentifier, socket);
  });

  socket.on('update-max-pixel-count', (data, callback) => {
    const { newMaxPixelCount } = data;
    if (!newMaxPixelCount || typeof newMaxPixelCount !== 'number') {
      callback({ success: false, message: 'Invalid maxPixelCount value' });
      return;
    }
    updateMaxPixelCount(uniqueIdentifier, newMaxPixelCount, callback);
  });

  socket.on('draw-pixel', async (pixelData) => {
    const currentIdentifier = socket.handshake.auth.uniqueIdentifier;
    const { x, y, color, userId = currentIdentifier } = pixelData;
  
    try {
      if (['/canvas-1', '/canvas-2', '/canvas-3'].includes(currentRoute)) {
        await handlePixelDraw(x, y, color, userId, io, currentRoute);
      } else if (currentRoute === '/single-player-game') {
        await handlePixelDraw(x, y, color, userId, io, currentRoute, currentIdentifier);
      } else if (currentRoute.startsWith('/battle/')) {
        const gameId = currentRoute.split('/')[2];
        const game = battleManager.games[gameId];
  
        if (game && game.state === 'drawing' && game.players.includes(currentIdentifier)) {
          const playerIndex = game.players.indexOf(currentIdentifier) + 1;
          const tableName = `P${playerIndex}_${gameId}`;
          
          db.run(
            `INSERT OR REPLACE INTO ${tableName} (x, y, color, userId) VALUES (?, ?, ?, ?)`,
            [x, y, color, currentIdentifier],
            (err) => {
              if (err) {
                logger.error(`Ошибка сохранения пикселя в ${tableName}: ${err.message}`);
              } else {
                console.log(`Игрок ${currentIdentifier} нарисовал пиксель в игре ${gameId}`);
                socket.emit('battle-pixel-drawn', { x, y, color });
                io.to(`game_${gameId}`).emit('battle-pixel-drawn', { x, y, color });
              }
            }
          );
        } else {
          console.log(`Игрок ${currentIdentifier} не может рисовать в игре ${gameId}, состояние: ${game?.state}`);
        }
      } else {
        logger.warn(`Неизвестный маршрут: ${currentRoute}`);
      }
  
      setDrawPixel(currentIdentifier, socket, currentRoute);
    } catch (err) {
      logger.error('Ошибка при отрисовке пикселя:', err);
    }
  });
  

  socket.on('get-leaderboard', () => {
    getLeaderboard(socket);
  });

  socket.on('requestTotalAmount', () => {
    getPlacedPixels(uniqueIdentifier, socket);
    getPlacedPixelsCanvas1(uniqueIdentifier, socket);
  });

  socket.on('get-achievements-user-data', () => {
    getUserAchievement(uniqueIdentifier, socket);
  });

  socket.on('get-username-data', () => {
    getUsernameData(uniqueIdentifier, socket);
  });

  socket.on('get-battle-games', () => {
    socket.join('battle-lobby');
    const availableGames = battleManager.getAvailableGames();
    socket.emit('battle-games', availableGames);
  });

  socket.on('create-battle-game', (data) => {
    const { serverId } = data || {};
    const gameId = battleManager.createGame(serverId);
    socket.emit('game-created', { gameId, serverId });
  });

  socket.on('join-battle-game', (data) => {
    const { gameId } = data;
    const playerId = socket.handshake.auth.uniqueIdentifier;

    if (!playerId) {
      socket.emit('join-failed', { message: 'Не найден уникальный идентификатор игрока.' });
      return;
    }

    const tryJoin = (targetGameId) => {
      const success = battleManager.joinGame(targetGameId, playerId, socket);
      if (success) {
        const game = battleManager.games[targetGameId];
        console.log(
          `Игрок ${playerId} (сокет ${socket.id}) присоединен к игре ${targetGameId}`
        );
        socket.emit('joined-game', { gameId: targetGameId });
        socket.emit('game-state', {
          gameId: targetGameId,
          players: game.players,
          countdown: game.state === 'countdown' ? game.countdown : null,
          status: game.state,
        });
      } else {
        socket.emit('join-failed', { message: 'Игра недоступна или заполнена' });
      }
    };

    if (gameId === 'random') {
      const availableGames = battleManager.getAvailableGames().filter(
        (g) => g.state === 'waiting' && g.players.length < 8
      );
      if (availableGames.length > 0) {
        const randomGame = availableGames[Math.floor(Math.random() * availableGames.length)];
        tryJoin(randomGame.id);
      } else {
        socket.emit('join-failed', { message: 'Нет доступных игр' });
      }
    } else {
      tryJoin(gameId);
    }
  });

  socket.on('leave-battle-game', (data) => {
    const { gameId } = data;
    const playerId = socket.handshake.auth.uniqueIdentifier;
    battleManager.leaveGame(gameId, playerId);
    socket.emit('left-game', { gameId });
  });

  socket.on('check-game-ready', ({ gameId }, callback) => {
    const game = battleManager.games[gameId];
    if (game && game.state === 'countdown') {
      callback({ ready: true });
    } else {
      callback({ ready: false });
    }
  });

  socket.on('connect', () => {
    console.log('Client connected:', socket.id);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
    socket.emit('server-error', { message: 'Произошла ошибка на сервере' });
  });

  socket.on('disconnect', () => {
    console.log(`Сокет ${socket.id} отключился, playerId: ${uniqueIdentifier}`);
    for (const gameId in battleManager.games) {
      const game = battleManager.games[gameId];
      if (game.players.includes(uniqueIdentifier)) {
        console.log(`Игрок ${uniqueIdentifier} временно отключён от игры ${gameId}`);
        io.to(`game_${gameId}`).emit('player-disconnected', { playerId: uniqueIdentifier });
      }
    }
    onlineUsers = Math.max(onlineUsers - 1, 0);
    io.emit('user-count', onlineUsers);
  });
}

module.exports = { handleSocketEvents };

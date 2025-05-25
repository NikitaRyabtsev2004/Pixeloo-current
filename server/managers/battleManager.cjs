// const crypto = require('crypto');
const { logger } = require('../utils/libs/logger.cjs');
const dbB1 = require('../database/dbB1Setup.cjs');
const dbB2 = require('../database/dbB2Setup.cjs');
const dbB3 = require('../database/dbB3Setup.cjs');
const dbB4 = require('../database/dbB4Setup.cjs');
const dbB5 = require('../database/dbB5Setup.cjs');
const games = {};
const WORD_LIST = [
  'банан',
  'колесо',
  'мяч',
  'воин',
  'дерево',
  'солнце',
  'кот',
  'дом',
];
const serverDbs = { b1: dbB1, b2: dbB2, b3: dbB3, b4: dbB4, b5: dbB5 };

module.exports = function (io) {
  function createGame(serverId = 'b1') {
    const gameId = crypto.randomBytes(8).toString('hex');
    const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    games[gameId] = {
      id: gameId,
      serverId,
      players: [],
      playerSockets: {},
      playerIndices: {},
      state: 'waiting',
      word,
      countdown: null,
      timer: null,
      drawingTime: 1 * 30 * 1000,
      evaluationTimeout: 2 * 1000,
      scores: {},
    };
    createGameTables(gameId);
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`Игра создана: ID=${gameId}, serverId=${serverId}`);
    }
    return gameId;
  }

  function joinGame(gameId, playerId, socket) {
    const game = games[gameId];
    if (!game) {
      logger.warn(`Игра ${gameId} не найдена`);
      return false;
    }
    if (!playerId) {
      logger.warn(`Игрок без идентификатора не может присоединиться к игре ${gameId}`);
      return false;
    }
    if (game.state !== 'waiting' || game.players.length >= 8) {
      logger.warn(`Игра ${gameId} недоступна для присоединения. Состояние: ${game.state}, игроков: ${game.players.length}`);
      return false;
    }
    if (!game.players.includes(playerId)) {
      game.players.push(playerId);
      game.playerSockets[playerId] = socket;
      const index = game.players.length;
      game.playerIndices[playerId] = index;
      console.log(`Игрок ${playerId} добавлен в игру ${gameId} с сокетом ${socket.id}`);
    }
    game.players.forEach((pId) => {
      const playerSocket = game.playerSockets[pId];
      if (playerSocket) {
        playerSocket.emit('game-state', {
          gameId,
          players: game.players,
          countdown: game.state === 'countdown' ? game.countdown : null,
          status: game.state,
        });
      }
    });
    io.to('battle-lobby').emit('battle-games', getAvailableGames());
  
    if (game.players.length === 2) {
      console.log(`Игра ${gameId}: запускаем отсчет. Игроки: ${game.players.join(', ')}`);
      startCountdown(gameId);
    }
    return true;
  }
  

  function leaveGame(gameId, playerId) {
    const game = games[gameId];
    if (!game) return;
    const index = game.players.indexOf(playerId);
    if (index !== -1) {
      game.players.splice(index, 1);
      delete game.playerSockets[playerId];
      delete game.playerIndices[playerId];
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`Игрок ${playerId} покинул игру ${gameId}`);
      }
    }
    if (game.players.length < 2 && game.state === 'countdown') {
      cancelCountdown(gameId);
    } else {
      game.players.forEach((pId) => {
        const playerSocket = game.playerSockets[pId];
        if (playerSocket) {
          playerSocket.emit('game-state', {
            gameId,
            players: game.players,
            countdown: null,
            status: game.state,
          });
        }
      });
    }
    io.to('battle-lobby').emit('battle-games', getAvailableGames());
  }

  function startCountdown(gameId) {
    try {
      const game = games[gameId];
      if (!game) return;
      game.state = 'countdown';
      let timeLeft = 10;
      game.countdown = timeLeft;

      game.players.forEach((playerId) => {
        const socket = game.playerSockets[playerId];
        if (socket) {
          socket.emit('game-state', {
            gameId,
            players: game.players,
            countdown: timeLeft,
            status: game.state,
          });
        }
      });

      game.timer = setInterval(() => {
        timeLeft -= 1;
        game.countdown = timeLeft;

        game.players.forEach((playerId) => {
          const socket = game.playerSockets[playerId];
          if (socket) {
            socket.emit('game-state', {
              gameId,
              players: game.players,
              countdown: timeLeft,
              status: game.state,
            });
          }
        });

        if (timeLeft === 0) {
          console.log(`"timer left game start" - ${gameId}`);
          console.log(`Игроки в игре ${gameId}:`, game.players);

          const activeSockets = game.players.filter((playerId) => {
            const socket = game.playerSockets[playerId];
            return socket && socket.connected;
          });

          if (activeSockets.length < 2) {
            console.error(`Недостаточно активных игроков для игры ${gameId}`);
            game.state = 'waiting';
            game.countdown = null;
            game.players.forEach((playerId) => {
              const socket = game.playerSockets[playerId];
              if (socket) {
                socket.emit('game-state', {
                  gameId,
                  players: game.players,
                  countdown: null,
                  status: game.state,
                });
              }
            });
            clearInterval(game.timer);
            return;
          }

          clearInterval(game.timer);
          startDrawing(gameId);
          console.log(`Отправка 'startGame' для игры ${gameId} игрокам`);
          game.players.forEach((playerId) => {
            const socket = game.playerSockets[playerId];
            if (socket) {
              socket.emit('startGame', { gameId });
            }
          });
        }
      }, 1000);
    } catch (error) {
      logger.error(`Ошибка в startCountdown для игры ${gameId}: ${error.message}`);
    }
  }

  function cancelCountdown(gameId) {
    try {
      const game = games[gameId];
      if (!game) return;
      if (game.timer) {
        clearInterval(game.timer);
        game.timer = null;
      }
      game.state = 'waiting';
      game.countdown = null;
      io.to(`game_${gameId}`).emit('game-state', {
        gameId,
        players: game.players,
        countdown: null,
        status: game.state,
      });
    } catch (error) {
      logger.error(
        `Ошибка в cancelCountdown для игры ${gameId}: ${error.message}`
      );
    }
  }

  function startDrawing(gameId) {
    try {
      const game = games[gameId];
      if (!game) return;
      game.state = 'drawing';
      clearCanvases(gameId);
      io.to(`game_${gameId}`).emit('startDrawing', {
        word: game.word,
        timeLeft: game.drawingTime / 1000,
      });
      game.timer = setTimeout(() => startEvaluation(gameId), game.drawingTime);
    } catch (error) {
      logger.error(
        `Ошибка в startDrawing для игры ${gameId}: ${error.message}`
      );
    }
  }

  function startEvaluation(gameId) {
    try {
      const game = games[gameId];
      if (!game) return;
      game.state = 'evaluation';
      io.to(`game_${gameId}`).emit('startEvaluation');
      evaluateNextCanvas(gameId, 0);
    } catch (error) {
      logger.error(
        `Ошибка в startEvaluation для игры ${gameId}: ${error.message}`
      );
    }
  }

  function evaluateNextCanvas(gameId, playerIndex) {
    try {
      const game = games[gameId];
      if (!game || playerIndex >= game.players.length) {
        collectVotes(gameId);
        return;
      }
      const playerId = game.players[playerIndex];
      loadCanvas(gameId, playerId, (canvasData) => {
        io.to(`game_${gameId}`).emit('evaluateCanvas', {
          playerId,
          canvasData,
          timeLeft: game.evaluationTimeout / 1000,
        });
        game.timer = setTimeout(
          () => evaluateNextCanvas(gameId, playerIndex + 1),
          game.evaluationTimeout
        );
      });
    } catch (error) {
      logger.error(
        `Ошибка в evaluateNextCanvas для игры ${gameId}: ${error.message}`
      );
    }
  }

  function collectVotes(gameId) {
    try {
      const game = games[gameId];
      if (!game) return;
      const scores = {};
      for (const playerId of game.players) {
        const playerScores = game.scores[playerId] || [];
        const averageScore =
          playerScores.length > 0
            ? playerScores.reduce((a, b) => a + b, 0) / playerScores.length
            : 0;
        scores[playerId] = averageScore;
      }
      let winnerId = null;
      let maxScore = -1;
      for (const [playerId, score] of Object.entries(scores)) {
        if (score > maxScore) {
          maxScore = score;
          winnerId = playerId;
        }
      }
      io.to(`game_${gameId}`).emit('votingResults', {
        scores,
        winner: { playerId: winnerId, score: maxScore },
      });
      loadCanvas(gameId, winnerId, (winnerCanvas) => {
        io.to(`game_${gameId}`).emit('showWinnerCanvas', {
          winnerId,
          canvasData: winnerCanvas,
        });
      });
      setTimeout(() => endGame(gameId), 20000);
    } catch (error) {
      logger.error(
        `Ошибка в collectVotes для игры ${gameId}: ${error.message}`
      );
    }
  }

  function endGame(gameId) {
    try {
      const game = games[gameId];
      if (!game) return;
      game.state = 'finished';
      io.to(`game_${gameId}`).emit('gameFinished', {
        message: 'Игра завершена. Вы будете перенаправлены на основной холст.',
      });
      setTimeout(() => {
        game.players = [];
        game.playerIndices = {};
        game.state = 'waiting';
        game.countdown = null;
        game.timer = null;
        game.scores = {};
        game.word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
        clearCanvases(gameId);
        io.to(`game_${gameId}`).emit('game-reset', { gameId });
        io.to('battle-lobby').emit('battle-games', getAvailableGames());
        if (process.env.NODE_ENV !== 'production') {
          logger.info(`Игра ${gameId} сброшена до состояния 'waiting'`);
        }
      }, 5000);
    } catch (error) {
      logger.error(`Ошибка в endGame для игры ${gameId}: ${error.message}`);
    }
  }

  function clearCanvases(gameId) {
    const game = games[gameId];
    if (!game) return;
    const db = serverDbs[game.serverId];
    for (let i = 1; i <= 8; i++) {
      const tableName = `P${i}_${gameId}`;
      db.run(`DELETE FROM ${tableName}`, (err) => {
        if (err) logger.error(`Ошибка очистки ${tableName}: ${err.message}`);
      });
    }
  }

  function createGameTables(gameId) {
    const game = games[gameId];
    if (!game) return;
    const db = serverDbs[game.serverId];
    for (let i = 1; i <= 8; i++) {
      const tableName = `P${i}_${gameId}`;
      db.run(
        `CREATE TABLE IF NOT EXISTS ${tableName} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          x INTEGER,
          y INTEGER,
          color TEXT,
          userId TEXT,
          UNIQUE(x, y)
        )`,
        (err) => {
          if (err)
            logger.error(
              `Ошибка создания таблицы ${tableName}: ${err.message}`
            );
        }
      );
    }
  }

  function savePixel(gameId, playerId, x, y, color) {
    const game = games[gameId];
    if (!game || game.state !== 'drawing') return;
    const playerIndex = game.playerIndices[playerId];
    if (!playerIndex) return;
    const db = serverDbs[game.serverId];
    const tableName = `P${playerIndex}_${gameId}`;
    db.run(
      `INSERT OR REPLACE INTO ${tableName} (x, y, color, userId) VALUES (?, ?, ?, ?)`,
      [x, y, color, playerId],
      (err) => {
        if (err) logger.error(`Ошибка сохранения пикселя: ${err.message}`);
      }
    );
  }

  function loadCanvas(gameId, playerId, callback) {
    const game = games[gameId];
    if (!game) return;
    const playerIndex = game.playerIndices[playerId];
    const db = serverDbs[game.serverId];
    const tableName = `P${playerIndex}_${gameId}`;
    db.all(`SELECT x, y, color FROM ${tableName}`, [], (err, rows) => {
      if (err) {
        logger.error(`Ошибка загрузки холста ${tableName}: ${err.message}`);
        callback([]);
      } else {
        callback(rows);
      }
    });
  }

  function getAvailableGames() {
    const available = Object.values(games).map((game) => ({
      id: game.id,
      serverId: game.serverId,
      players: game.players,
      state: game.state,
    }));
    return available;
  }

  return {
    createGame,
    joinGame,
    leaveGame,
    games,
    savePixel,
    startDrawing,
    evaluateNextCanvas,
    getAvailableGames,
  };
};

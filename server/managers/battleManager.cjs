// /* eslint-disable no-console */

// const moment = require('moment');
// const { v4: uuidv4 } = require('uuid');
// const { logger } = require('../utils/libs/logger.cjs');

// const dbB1 = require('../database/dbB1Setup.cjs');
// const dbB2 = require('../database/dbB2Setup.cjs');
// const dbB3 = require('../database/dbB3Setup.cjs');
// const dbB4 = require('../database/dbB4Setup.cjs');
// const dbB5 = require('../database/dbB5Setup.cjs');

// const WORDS = [
//   'Морковь',
//   'Дерево',
//   'Солнце',
//   'Дом',
//   'Кот',
//   'Собака',
//   'Машина',
//   'Река',
//   'Гора',
//   'Цветок',
//   'Небо',
//   'Звезда',
//   'Море',
//   'Луна',
//   'Облако',
//   'Яблоко',
// ];

// const BATTLE_DBS = { b1: dbB1, b2: dbB2, b3: dbB3, b4: dbB4, b5: dbB5 };

// const DRAWING_TIME = 60; // 20 секунд для рисования
// const COUNTDOWN_TIME = 5; // 5 секунд отсчета
// const EVALUATION_TIME = 5; // 5 секунд на оценку
// const WINNER_DISPLAY_TIME = 5; // 5 секунд показа победителя

// const MIN_PLAYERS = 1;
// const MAX_PLAYERS = 8;

// module.exports = (io) => {
//   const games = {};

//   const getRandomWord = () => {
//     return WORDS[Math.floor(Math.random() * WORDS.length)];
//   };

//   const getRandomCanvasRoute = () => {
//     const routes = ['/canvas-1', '/canvas-2', '/canvas-3'];
//     return routes[Math.floor(Math.random() * routes.length)];
//   };

//   const createGame = (lobbyId) => {
//     const gameId = uuidv4().replace(/-/g, '_');
//     games[gameId] = {
//       id: gameId,
//       lobbyId,
//       state: 'waiting',
//       players: [],
//       playerSockets: {},
//       countdown: null,
//       countdownInterval: null,
//       drawingTime: null,
//       drawingInterval: null,
//       evaluationInterval: null,
//       word: null,
//       evaluations: {},
//       scores: {},
//       winner: null,
//       currentEvaluationIndex: 0,
//       isActive: true,
//       createdAt: Date.now(),
//     };

//     logger.info(`Игра ${gameId} создана в лобби ${lobbyId}`);
//     return gameId;
//   };

//   const joinGame = (lobbyId, playerId, socket) => {
//     let game = Object.values(games).find(
//       (g) =>
//         g.lobbyId === lobbyId &&
//         g.isActive &&
//         (g.state === 'waiting' || g.state === 'countdown') &&
//         g.players.length < MAX_PLAYERS
//     );

//     if (!game) {
//       const gameId = createGame(lobbyId);
//       game = games[gameId];
//     }

//     if (game.players.includes(playerId)) {
//       logger.warn(`Игрок ${playerId} уже в игре ${game.id}`);
//       game.playerSockets[playerId] = socket;
//       return { success: true, gameId: game.id, lobbyId, status: game.state };
//     }

//     if (game.players.length >= MAX_PLAYERS) {
//       logger.warn(`Игра ${game.id} заполнена`);
//       return { success: false, message: 'Игра заполнена' };
//     }

//     game.players.push(playerId);
//     game.playerSockets[playerId] = socket;
//     logger.info(
//       `Игрок ${playerId} присоединился к игре ${game.id} в лобби ${lobbyId}`
//     );

//     socket.join(`game_${game.id}`);

//     if (
//       game.state === 'waiting' &&
//       game.players.length >= MIN_PLAYERS &&
//       !game.countdown
//     ) {
//       startCountdown(game.id);
//     }

//     // Notify about game updates
//     io.to('battle-lobby').emit('battle-games', getAvailableGames());
//     io.to(`game_${game.id}`).emit('game-state', {
//       gameId: game.id,
//       lobbyId: game.lobbyId,
//       players: game.players,
//       countdown: game.countdown,
//       status: game.state,
//     });

//     return { success: true, gameId: game.id, lobbyId, status: game.state };
//   };

//   const leaveGame = (gameId, playerId) => {
//     if (!games[gameId]) {
//       logger.error(`Игра ${gameId} не найдена при попытке покинуть`);
//       return;
//     }

//     const game = games[gameId];
//     if (!game.players.includes(playerId)) {
//       return;
//     }

//     game.players = game.players.filter((id) => id !== playerId);
//     delete game.playerSockets[playerId];
//     logger.info(`Игрок ${playerId} покинул игру ${gameId}`);

//     if (game.state === 'countdown' && game.players.length < MIN_PLAYERS) {
//       if (game.countdownInterval) {
//         clearInterval(game.countdownInterval);
//         game.countdownInterval = null;
//       }

//       game.countdown = null;
//       game.state = 'waiting';
//       logger.info(
//         `Игра ${gameId} вернулась в режим ожидания из-за недостатка игроков`
//       );
//     }

//     // If no players left, mark game as inactive after delay
//     if (game.players.length === 0) {
//       setTimeout(() => {
//         if (games[gameId] && games[gameId].players.length === 0) {
//           cleanupGame(gameId);
//         }
//       }, 5000); // 5 seconds delay
//     }

//     io.to('battle-lobby').emit('battle-games', getAvailableGames());
//     io.to(`game_${gameId}`).emit('game-state', {
//       gameId,
//       lobbyId: game.lobbyId,
//       players: game.players,
//       countdown: game.countdown,
//       status: game.state,
//     });
//   };

//   const cleanupGame = (gameId) => {
//     const game = games[gameId];
//     if (!game) return;

//     // Clear all intervals
//     if (game.countdownInterval) {
//       clearInterval(game.countdownInterval);
//     }
//     if (game.drawingInterval) {
//       clearInterval(game.drawingInterval);
//     }
//     if (game.evaluationInterval) {
//       clearInterval(game.evaluationInterval);
//     }

//     // Clean up game tables
//     if (game.players && game.players.length > 0) {
//       game.players.forEach((_, index) => {
//         const tableName = `P${index + 1}_${gameId}`;
//         const db = BATTLE_DBS[game.lobbyId];
//         if (db) {
//           db.run(`DROP TABLE IF EXISTS "${tableName}"`, (err) => {
//             if (err) {
//               logger.error(
//                 `Ошибка удаления таблицы ${tableName}: ${err.message}`
//               );
//             }
//           });
//         }
//       });
//     }

//     // Не удаляем игру сразу, а помечаем как неактивную
//     game.isActive = false;
//     logger.info(`Игра ${gameId} помечена как неактивная`);

//     // Создаем новую игру для лобби через 5 секунд
//     setTimeout(() => {
//       if (games[gameId]) {
//         delete games[gameId];
//         logger.info(`Игра ${gameId} удалена`);
//       }
//       // Создаем новую игру для того же лобби
//       createGame(game.lobbyId);
//       logger.info(`Создана новая игра для лобби ${game.lobbyId}`);
//     }, 5000);
//   };

//   const startCountdown = (gameId) => {
//     const game = games[gameId];
//     if (!game || !game.isActive) {
//       logger.error(`Игра ${gameId} не найдена при запуске отсчета`);
//       return;
//     }

//     game.countdown = COUNTDOWN_TIME;
//     game.state = 'countdown';
//     logger.info(
//       `Запущен отсчет для игры ${gameId}, время: ${COUNTDOWN_TIME} секунд`
//     );

//     io.to('battle-lobby').emit('battle-games', getAvailableGames());
//     io.to(`game_${gameId}`).emit('game-state', {
//       gameId,
//       lobbyId: game.lobbyId,
//       players: game.players,
//       countdown: game.countdown,
//       status: game.state,
//     });

//     if (game.countdownInterval) {
//       clearInterval(game.countdownInterval);
//     }

//     game.countdownInterval = setInterval(() => {
//       if (!games[gameId] || !games[gameId].isActive) {
//         clearInterval(game.countdownInterval);
//         return;
//       }

//       game.countdown -= 1;

//       io.to('battle-lobby').emit('battle-games', getAvailableGames());
//       io.to(`game_${gameId}`).emit('game-state', {
//         gameId,
//         lobbyId: game.lobbyId,
//         players: game.players,
//         countdown: game.countdown,
//         status: game.state,
//       });

//       logger.info(`Игра ${gameId}: осталось ${game.countdown} секунд`);

//       if (game.countdown <= 0) {
//         clearInterval(game.countdownInterval);
//         game.countdownInterval = null;
//         startDrawing(gameId);
//       }
//     }, 1000);
//   };

//   const startDrawing = (gameId) => {
//     const game = games[gameId];
//     if (!game || !game.isActive) {
//       logger.error(`Игра ${gameId} не найдена при запуске рисования`);
//       return;
//     }

//     game.state = 'drawing';
//     game.word = getRandomWord();
//     game.drawingTime = DRAWING_TIME;
//     logger.info(
//       `Игра ${gameId} переходит в режим рисования. Слово: ${game.word}`
//     );

//     const createTablesPromises = game.players.map((playerId, index) => {
//       return new Promise((resolve, reject) => {
//         const tableName = `P${index + 1}_${gameId}`;
//         const db = BATTLE_DBS[game.lobbyId];
//         if (!db) {
//           reject(new Error(`База данных для лобби ${game.lobbyId} не найдена`));
//           return;
//         }

//         db.run(
//           `CREATE TABLE IF NOT EXISTS "${tableName}" (
//                     x INTEGER,
//                     y INTEGER,
//                     color TEXT,
//                     userId TEXT,
//                     PRIMARY KEY (x, y)
//                 )`,
//           (err) => {
//             if (err) {
//               logger.error(
//                 `Ошибка создания таблицы ${tableName}: ${err.message}`
//               );
//               reject(err);
//             } else {
//               logger.info(`Таблица ${tableName} создана для игры ${gameId}`);
//               resolve();
//             }
//           }
//         );
//       });
//     });

//     Promise.all(createTablesPromises)
//       .then(() => {
//         if (!games[gameId] || !games[gameId].isActive) {
//           logger.warn(`Игра ${gameId} была удалена во время создания таблиц`);
//           return;
//         }

//         // Отправляем событие startDrawing всем игрокам
//         io.to('battle-lobby').emit('battle-games', getAvailableGames());

//         game.players.forEach((playerId) => {
//           const playerSocket = game.playerSockets[playerId];
//           if (playerSocket) {
//             playerSocket.emit('startDrawing', {
//               gameId,
//               word: game.word,
//               timeLeft: game.drawingTime,
//               redirect: `/battle/${gameId}`,
//               lobbyId: game.lobbyId,
//               playerIndex: game.players.indexOf(playerId),
//             });
//           }
//         });

//         // Также отправляем в комнату игры
//         io.to(`game_${gameId}`).emit('startDrawing', {
//           gameId,
//           word: game.word,
//           timeLeft: game.drawingTime,
//           redirect: `/battle/${gameId}`,
//           lobbyId: game.lobbyId,
//         });

//         // Отправляем пустые данные холста для каждого игрока
//         game.players.forEach((playerId, index) => {
//           const playerSocket = game.playerSockets[playerId];
//           if (playerSocket) {
//             playerSocket.emit('battle-canvas-data', []);
//           }
//         });

//         // Запускаем таймер рисования
//         if (game.drawingInterval) {
//           clearInterval(game.drawingInterval);
//         }

//         game.drawingInterval = setInterval(() => {
//           if (!games[gameId] || !games[gameId].isActive) {
//             clearInterval(game.drawingInterval);
//             return;
//           }

//           game.drawingTime -= 1;
//           io.to(`game_${gameId}`).emit('drawing-time-update', {
//             timeLeft: game.drawingTime,
//           });

//           if (game.drawingTime <= 0) {
//             clearInterval(game.drawingInterval);
//             game.drawingInterval = null;
//             startEvaluation(gameId);
//           }
//         }, 1000);
//       })
//       .catch((error) => {
//         logger.error(`Ошибка при создании таблиц для игры ${gameId}:`, error);
//         io.to(`game_${gameId}`).emit('error', {
//           message: 'Ошибка при подготовке игры',
//         });
//       });
//   };

//   const startEvaluation = (gameId) => {
//     const game = games[gameId];
//     if (!game || !game.isActive) {
//       logger.error(`Игра ${gameId} не найдена при запуске голосования`);
//       return;
//     }

//     game.state = 'evaluation';
//     game.currentEvaluationIndex = 0;
//     logger.info(`Игра ${gameId} переходит в режим оценки`);

//     const evaluateNextCanvas = () => {
//       if (!games[gameId] || !games[gameId].isActive) {
//         logger.warn(`Игра ${gameId} была удалена во время оценки`);
//         return;
//       }

//       if (game.currentEvaluationIndex >= game.players.length) {
//         endEvaluation(gameId);
//         return;
//       }

//       const playerId = game.players[game.currentEvaluationIndex];
//       const tableName = `P${game.currentEvaluationIndex + 1}_${gameId}`;
//       const db = BATTLE_DBS[game.lobbyId];

//       if (!db) {
//         logger.error(`База данных для лобби ${game.lobbyId} не найдена`);
//         return;
//       }

//       db.all(`SELECT x, y, color FROM "${tableName}"`, [], (err, rows) => {
//         if (err) {
//           logger.error(`Ошибка загрузки холста ${tableName}: ${err.message}`);
//           io.to(`game_${gameId}`).emit('error', {
//             message: `Ошибка загрузки холста ${tableName}`,
//           });
//           return;
//         }

//         io.to(`game_${gameId}`).emit('evaluateCanvas', {
//           playerId,
//           canvasData: rows || [],
//         });

//         let timeLeft = EVALUATION_TIME;
//         io.to(`game_${gameId}`).emit('evaluation-time-update', { timeLeft });

//         if (game.evaluationInterval) {
//           clearInterval(game.evaluationInterval);
//         }

//         game.evaluationInterval = setInterval(() => {
//           if (!games[gameId] || !games[gameId].isActive) {
//             clearInterval(game.evaluationInterval);
//             return;
//           }

//           timeLeft -= 1;
//           io.to(`game_${gameId}`).emit('evaluation-time-update', { timeLeft });

//           if (timeLeft <= 0) {
//             clearInterval(game.evaluationInterval);
//             game.currentEvaluationIndex += 1;
//             evaluateNextCanvas();
//           }
//         }, 1000);
//       });
//     };

//     io.to(`game_${gameId}`).emit('startEvaluation');
//     evaluateNextCanvas();
//   };

//   const endEvaluation = (gameId) => {
//     const game = games[gameId];
//     if (!game || !game.isActive) {
//         logger.error(`Игра ${gameId} не найдена при завершении голосования`);
//         return;
//     }

//     game.state = 'finished';
//     const scores = {};
//     game.players.forEach((playerId) => {
//         scores[playerId] = game.evaluations[playerId]
//             ? game.evaluations[playerId].reduce((sum, score) => sum + score, 0)
//             : 0;
//     });

//     let winner = { playerId: null, score: -1 };
//     Object.entries(scores).forEach(([playerId, score]) => {
//         if (score > winner.score) {
//             winner = { playerId, score };
//         }
//     });

//     game.scores = scores;
//     game.winner = winner;

//     const winnerTable = `P${game.players.indexOf(winner.playerId) + 1}_${gameId}`;
//     const db = BATTLE_DBS[game.lobbyId];

//     if (!db) {
//         logger.error(`База данных для лобби ${game.lobbyId} не найдена при завершении`);
//         return;
//     }

//     db.all(`SELECT x, y, color FROM "${winnerTable}"`, [], (err, rows) => {
//         if (err) {
//             logger.error(`Ошибка загрузки холста победителя ${winnerTable}: ${err.message}`);
//             io.to(`game_${gameId}`).emit('error', {
//                 message: `Ошибка загрузки холста победителя`,
//             });
//             return;
//         }

//         io.to(`game_${gameId}`).emit('votingResults', {
//             scores,
//             winner,
//         });

//         io.to(`game_${gameId}`).emit('showWinnerCanvas', {
//             canvasData: rows || [],
//         });

//         setTimeout(() => {
//             if (games[gameId]) {
//                 io.to(`game_${gameId}`).emit('gameFinished', {
//                     redirect: getRandomCanvasRoute(),
//                 });

//                 // Не удаляем игру сразу, используем cleanupGame
//                 setTimeout(() => {
//                     cleanupGame(gameId);
//                     io.to('battle-lobby').emit('battle-games', getAvailableGames());
//                 }, 2000);
//             }
//         }, WINNER_DISPLAY_TIME * 1000);
//     });
// };

//   const submitEvaluation = (gameId, playerId, score) => {
//     const game = games[gameId];
//     if (!game || !game.isActive) {
//       logger.error(`Игра ${gameId} не найдена при отправке оценки`);
//       return;
//     }

//     if (!game.evaluations[playerId]) {
//       game.evaluations[playerId] = [];
//     }

//     game.evaluations[playerId].push(score);
//     logger.info(`Игрок ${playerId} оценил холст в игре ${gameId}: ${score}`);
//   };

//   const getAvailableGames = () => {
//     return Object.values(games)
//       .filter((game) => game.isActive)
//       .map((game) => ({
//         id: game.id,
//         lobbyId: game.lobbyId,
//         players: game.players,
//         status: game.state,
//         countdown: game.countdown,
//       }));
//   };

//   // Create initial games for each lobby
//   ['b1', 'b2', 'b3', 'b4', 'b5'].forEach((lobbyId) => {
//     createGame(lobbyId);
//   });

//   // Cleanup inactive games periodically
//   setInterval(() => {
//     const now = Date.now();
//     Object.keys(games).forEach((gameId) => {
//       const game = games[gameId];
//       if (!game.isActive && now - game.createdAt > 300000) {
//         // 5 minutes
//         cleanupGame(gameId);
//       }
//     });
//   }, 60000); // Check every minute

//   return {
//     games,
//     createGame,
//     joinGame,
//     leaveGame,
//     submitEvaluation,
//     getAvailableGames,
//     cleanupGame,
//   };
// };

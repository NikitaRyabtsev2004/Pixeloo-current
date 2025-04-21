/* eslint-disable no-console */
const db = require('../database/dbSetup.cjs');
const { logger } = require('../utils/libs/logger.cjs');
const moment = require('moment');
const { sendUserPixelCount } = require('../utils/pixel/sendUserPixelCount.cjs');
const { games } = require('../managers/battleManager.cjs');
require('moment/locale/ru');
moment.locale('ru');

function getUserData(uniqueIdentifier, socket) {
  db.get(
    'SELECT id, username, email, pixelCount, lastLogin FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, user) => {
      if (err) {
        logger.error('Database error:', err.message);
        return;
      }

      if (!user) {
        return socket.emit('error', { message: 'User not found' });
      }

      socket.emit('user-status', {
        username: user.username,
        email: user.email,
        pixelCount: user.pixelCount,
        lastLogin: user.lastLogin,
      });
    }
  );
}

function getUserName(tableName, callback, x, y, uniqueIdentifier) {
  if (!tableName) {
    // console.error('Table name is not defined');
    return callback({ success: false, message: 'Table not specified' });
  }

  const finalTableName =
    typeof tableName === 'string' && tableName.includes('SinglePlayer')
      ? `SinglePlayer_${uniqueIdentifier}`
      : tableName;

  if (
    finalTableName.startsWith('SinglePlayer') &&
    !finalTableName.endsWith(uniqueIdentifier)
  ) {
    return callback({ success: false, message: 'Access denied' });
  }

  db.get(
    `SELECT userId FROM ${finalTableName} WHERE x = ? AND y = ?`,
    [x, y],
    (err, pixelRow) => {
      if (err) {
        console.error('Database error:', err.message);
        return callback({ success: false, message: 'Database error' });
      }

      if (!pixelRow || !pixelRow.userId) {
        return callback({ success: false, message: 'Pixel not found' });
      }

      const userId = pixelRow.userId;

      db.get(
        `SELECT username FROM Users WHERE uniqueIdentifier = ?`,
        [userId],
        (err, userRow) => {
          if (err) {
            console.error('User data error:', err.message);
            return callback({
              success: false,
              message: 'Database error',
            });
          }

          if (userRow && userRow.username) {
            return callback({
              success: true,
              username: userRow.username,
            });
          } else {
            return callback({
              success: false,
              message: 'User not found',
            });
          }
        }
      );
    }
  );
}

function getPixelColor(tableName, callback, x, y) {
  db.get(
    `SELECT color FROM ${tableName} WHERE x = ? AND y = ?`,
    [x, y],
    (err, pixelRow) => {
      if (err) {
        // console.error('Ошибка базы данных:', err.message);
        return callback({ success: false, message: 'Database error' });
      }

      if (!pixelRow || !pixelRow.color) {
        return callback({ success: false, message: 'Pixel not found' });
      }

      return callback({
        success: true,
        color: pixelRow.color,
      });
    }
  );
}

function getCanvasStatus(canvasName, socket, route) {
  if (!canvasName) {
    logger.error('Canvas Status Error: canvasName is undefined');
    return;
  }

  const eventName =
    route === '/single-player-game'
      ? 'single-player-canvas-data'
      : `canvas-data-${route.slice(-1)}`;

  db.all(`SELECT x, y, color FROM ${canvasName}`, [], (err, rows) => {
    if (err) {
      logger.error(
        `Canvas Status (${canvasName}) - Database error: ${err.message}`
      );
      return;
    }
    socket.emit(eventName, rows);
  });
}

function setDrawPixel(uniqueIdentifier, socket, route) {
  const incrementPlacedPixels = [
    '/canvas-1',
    '/canvas-2',
    '/canvas-3',
  ].includes(route);

  let sql;
  let params;

  if (incrementPlacedPixels) {
    sql = `UPDATE Users 
           SET pixelCount = pixelCount - 1, 
               placedPixels = placedPixels + 1 
           WHERE uniqueIdentifier = ? AND pixelCount > 0`;
    params = [uniqueIdentifier];
  } else {
    sql = `UPDATE Users 
           SET pixelCount = pixelCount - 0
           WHERE uniqueIdentifier = ? AND pixelCount > 0`;
    params = [uniqueIdentifier];
  }

  db.run(sql, params, (updateErr) => {
    if (updateErr) {
      logger.error('Database error:', updateErr.message);
      return;
    }
    sendUserPixelCount(socket, uniqueIdentifier);
  });
}

function getMaxPixelCount(uniqueIdentifier, socket) {
  db.get(
    'SELECT maxPixelCount FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, row) => {
      if (err) {
        console.error('Ошибка при запросе maxPixelCount:', err.message);
        return;
      }

      if (row) {
        socket.emit('max-pixel-count-update', {
          maxPixelCount: row.maxPixelCount,
        });
      }
    }
  );
}

function updateMaxPixelCount(uniqueIdentifier, newMaxPixelCount, callback) {
  db.run(
    'UPDATE Users SET maxPixelCount = ? WHERE uniqueIdentifier = ?',
    [newMaxPixelCount, uniqueIdentifier],
    function (err) {
      if (err) {
        console.error('Error updating maxPixelCount:', err.message);
        callback({ success: false, message: 'Database update failed' });
        return;
      }

      if (this.changes > 0) {
        callback({ success: true });
      } else {
        callback({
          success: false,
          message: 'No user found with the given uniqueIdentifier',
        });
      }
    }
  );
}

function getLeaderboard(socket) {
  db.all(
    `SELECT username, placedPixels FROM Leaderboard ORDER BY placedPixels DESC LIMIT 10`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Ошибка запроса Leaderboard:', err.message);
        return;
      }
      socket.emit('updateLeaderboardAll', rows);
    }
  );

  db.all(
    `SELECT username, placedPixels FROM Leaderboard2 ORDER BY placedPixels DESC LIMIT 10`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Ошибка запроса Leaderboard:', err.message);
        return;
      }
      socket.emit('updateLeaderboardCanvas1', rows);
    }
  );

  db.all(
    `SELECT username, placedPixels FROM Leaderboard3 ORDER BY placedPixels DESC LIMIT 10`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Ошибка запроса Leaderboard:', err.message);
        return;
      }
      socket.emit('updateLeaderboardCanvas2', rows);
    }
  );

  db.all(
    `SELECT username, placedPixels FROM Leaderboard4 ORDER BY placedPixels DESC LIMIT 10`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Ошибка запроса Leaderboard:', err.message);
        return;
      }
      socket.emit('updateLeaderboardCanvas3', rows);
    }
  );
}

function getPlacedPixels(uniqueIdentifier, socket) {
  db.get(
    'SELECT placedPixels FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, row) => {
      if (err) {
        console.error('Ошибка при запросе placedPixels:', err.message);
        return;
      }

      if (row) {
        socket.emit('placed-pixels-update', {
          placedPixels: row.placedPixels,
        });
      } else {
        console.log('Пользователь с таким uniqueIdentifier не найден');
      }
    }
  );
}

function getPlacedPixelsCanvas1(uniqueIdentifier, socket) {
  db.get(
    'SELECT username FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, userRow) => {
      if (err) {
        console.error('Ошибка при запросе username:', err.message);
        return;
      }

      if (!userRow) {
        console.log('Пользователь с таким uniqueIdentifier не найден');
        // socket.emit('leaderboard-pixels-error', { message: 'User not found' });
        return;
      }

      const username = userRow.username;

      db.get(
        'SELECT placedPixels FROM Leaderboard2 WHERE username = ?',
        [username],
        (err, lbRow) => {
          if (err) {
            console.error('Ошибка при запросе Leaderboard2:', err.message);
            // socket.emit('leaderboard-pixels-error', { message: 'Database error' });
            return;
          }

          const pixels = lbRow ? lbRow.placedPixels : 0;
          socket.emit('placed-pixels-update-canvas-1', {
            placedPixels: pixels,
          });
        }
      );

      db.get(
        'SELECT placedPixels FROM Leaderboard3 WHERE username = ?',
        [username],
        (err, lbRow) => {
          if (err) {
            console.error('Ошибка при запросе Leaderboard2:', err.message);
            return;
          }
          const pixels = lbRow ? lbRow.placedPixels : 0;
          socket.emit('placed-pixels-update-canvas-2', {
            placedPixels: pixels,
          });
        }
      );

      db.get(
        'SELECT placedPixels FROM Leaderboard4 WHERE username = ?',
        [username],
        (err, lbRow) => {
          if (err) {
            console.error('Ошибка при запросе Leaderboard2:', err.message);
            return;
          }
          const pixels = lbRow ? lbRow.placedPixels : 0;
          socket.emit('placed-pixels-update-canvas-3', {
            placedPixels: pixels,
          });
        }
      );
    }
  );
}

function getUserAchievement(uniqueIdentifier, socket) {
  db.get(
    'SELECT username FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, userRow) => {
      if (err) {
        console.error('Ошибка при запросе username:', err.message);
        return;
      }

      if (!userRow) {
        return;
      }

      const username = userRow.username;

      db.get(
        'SELECT * FROM Achievements WHERE username = ?',
        [username],
        (err, achievementsRow) => {
          if (err) {
            console.error('Ошибка при запросе Achievements:', err.message);
            return;
          }

          if (!achievementsRow) {
            console.log('Достижения для пользователя не найдены');
            return;
          }

          socket.emit('achievements-user-data', achievementsRow);
        }
      );
    }
  );
}

function getUsernameData(uniqueIdentifier, socket) {
  db.get(
    `SELECT username, email FROM Users WHERE uniqueIdentifier = ?`,
    [uniqueIdentifier],
    (err, row) => {
      if (err) {
        console.error('Ошибка получения данных пользователя:', err.message);
        socket.emit('username-data', {
          success: false,
          error: 'Database error',
        });
        return;
      }
      if (!row) {
        console.log('Пользователь не найден');
        socket.emit('username-data', {
          success: false,
          error: 'User not found',
        });
        return;
      }
      console.log('Пользователь найден');
      socket.emit('username-data', {
        success: true,
        username: row.username,
        email: row.email,
      });
    }
  );
}

function getPlayerNames(gameId, callback) {
  const game = games[gameId];
  if (!game) return callback({ success: false, message: 'Game not found' });

  const playerIds = game.players;
  const placeholders = playerIds.map(() => '?').join(',');
  db.all(
    `SELECT uniqueIdentifier, username FROM Users WHERE uniqueIdentifier IN (${placeholders})`,
    playerIds,
    (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
        return callback({ success: false, message: 'Database error' });
      }
      const playerNames = {};
      rows.forEach((row) => {
        playerNames[row.uniqueIdentifier] = row.username;
      });
      callback({ success: true, playerNames });
    }
  );
}

function getBattleCanvasStatus(tableName, socket) {
  db.all(`SELECT x, y, color FROM ${tableName}`, [], (err, rows) => {
    if (err) {
      logger.error(`Ошибка загрузки холста ${tableName}: ${err.message}`);
      socket.emit('battle-canvas-data', []);
    } else {
      socket.emit('battle-canvas-data', rows || []);
    }
  });
}

module.exports = {
  setDrawPixel,
  getUserData,
  getMaxPixelCount,
  updateMaxPixelCount,
  getUserName,
  getCanvasStatus,
  getLeaderboard,
  getPixelColor,
  getPlacedPixels,
  getPlacedPixelsCanvas1,
  getUserAchievement,
  getUsernameData,
  getPlayerNames,
  getBattleCanvasStatus,
};

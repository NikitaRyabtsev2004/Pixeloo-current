const db = require('../database/dbSetup.cjs');
const { logger } = require('../utils/libs/logger.cjs');
const moment = require('moment');
const { sendUserPixelCount } = require('../utils/pixel/sendUserPixelCount.cjs');
require('moment/locale/ru');
moment.locale('ru');

const boostMap = [
  { name: 'X2 6h', updateTime: 5, duration: 6 * 60 * 60 },
  { name: 'X2 24h', updateTime: 5, duration: 24 * 60 * 60 },
  { name: 'X2 3d', updateTime: 5, duration: 3 * 24 * 60 * 60 },
  { name: 'X5 6h', updateTime: 2, duration: 6 * 60 * 60 },
  { name: 'X5 24h', updateTime: 2, duration: 24 * 60 * 60 },
  { name: 'X5 3d', updateTime: 2, duration: 3 * 24 * 60 * 60 },
  { name: 'X10 6h', updateTime: 1, duration: 6 * 60 * 60 },
];

function isValidHexColor(color) {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

function addUserCoins(uniqueIdentifier, coins, socket, callback) {
  if (!uniqueIdentifier || uniqueIdentifier === 'guest') {
    logger.warn(
      `Invalid uniqueIdentifier in addUserCoins: ${uniqueIdentifier}`
    );
    callback({ success: false, message: 'Invalid user identifier' });
    return;
  }

  if (!coins || typeof coins !== 'number' || coins <= 0) {
    logger.warn(`Invalid coins value: ${coins}`);
    callback({ success: false, message: 'Invalid coins value' });
    return;
  }

  db.get(
    'SELECT coins FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, userRow) => {
      if (err) {
        logger.error(`Database error fetching user coins: ${err.message}`);
        callback({ success: false, message: 'Database error' });
        return;
      }

      if (!userRow) {
        logger.warn(`User with uniqueIdentifier=${uniqueIdentifier} not found`);
        callback({ success: false, message: 'User not found' });
        return;
      }

      const currentCoins = parseFloat(userRow.coins) || 0;
      const newCoins = currentCoins + coins;
      logger.info(
        `Updating coins: ${currentCoins} + ${coins} = ${newCoins} for user ${uniqueIdentifier}`
      );

      db.run(
        'UPDATE Users SET coins = ? WHERE uniqueIdentifier = ?',
        [newCoins.toFixed(2), uniqueIdentifier],
        function (err) {
          if (err) {
            logger.error(`Database error updating coins: ${err.message}`);
            callback({
              success: false,
              message: 'Database error updating coins',
            });
            return;
          }

          if (this.changes === 0) {
            logger.warn(
              `No user record updated for uniqueIdentifier=${uniqueIdentifier}`
            );
            callback({ success: false, message: 'No user record updated' });
            return;
          }

          logger.info(
            `Successfully added ${coins} coins for user ${uniqueIdentifier}. New balance: ${newCoins}`
          );
          socket.emit('user-coins', { coins: parseFloat(newCoins.toFixed(2)) });
          callback({ success: true, coins: parseFloat(newCoins.toFixed(2)) });
        }
      );
    }
  );
}

function purchaseColor(uniqueIdentifier, color, socket, callback) {
  if (!isValidHexColor(color)) {
    logger.warn(`Invalid color format: ${color}`);
    callback({ success: false, message: 'Недопустимый формат цвета' });
    return;
  }

  db.get(
    'SELECT coins, userColors FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, userRow) => {
      if (err) {
        logger.error(`Ошибка при запросе данных пользователя: ${err.message}`);
        callback({ success: false, message: 'Ошибка базы данных' });
        return;
      }

      if (!userRow) {
        logger.warn(
          `Пользователь с uniqueIdentifier=${uniqueIdentifier} не найден`
        );
        callback({ success: false, message: 'Пользователь не найден' });
        return;
      }

      if (userRow.coins < 200) {
        logger.info(`Недостаточно монет для покупки цвета: ${color}`);
        callback({
          success: false,
          message: 'Недостаточно монет для покупки цвета',
        });
        return;
      }

      let colors = [];
      try {
        colors = userRow.userColors ? JSON.parse(userRow.userColors) : [];
      } catch (parseError) {
        logger.error(`Ошибка при парсинге userColors: ${parseError.message}`);
        callback({
          success: false,
          message: 'Ошибка обработки данных о цветах',
        });
        return;
      }

      if (colors.includes(color)) {
        logger.info(
          `Цвет ${color} уже есть у пользователя ${uniqueIdentifier}`
        );
        callback({ success: false, message: 'Этот цвет уже приобретен' });
        return;
      }

      colors.push(color);

      db.run(
        'UPDATE Users SET coins = coins - 200, userColors = ? WHERE uniqueIdentifier = ?',
        [JSON.stringify(colors), uniqueIdentifier],
        function (err) {
          if (err) {
            logger.error(`Ошибка при обновлении userColors: ${err.message}`);
            callback({
              success: false,
              message: 'Ошибка базы данных при покупке цвета',
            });
            return;
          }

          if (this.changes === 0) {
            logger.warn(
              `Запись для пользователя ${uniqueIdentifier} не обновлена`
            );
            callback({
              success: false,
              message: 'Не удалось обновить данные пользователя',
            });
            return;
          }

          logger.info(
            `Цвет ${color} успешно куплен для пользователя ${uniqueIdentifier}`
          );
          socket.emit('user-coins', { coins: userRow.coins - 200 });
          socket.emit('user-colors', { colors });
          callback({ success: true, color });
        }
      );
    }
  );
}

function getUserData(uniqueIdentifier, socket) {
  if (!uniqueIdentifier || uniqueIdentifier === 'guest') {
    logger.warn(`Invalid uniqueIdentifier in getUserData: ${uniqueIdentifier}`);
    socket.emit('error', { message: 'Invalid user identifier' });
    return;
  }

  db.get(
    'SELECT id, username, email, pixelCount, lastLogin FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, user) => {
      if (err) {
        logger.error(
          `Database error in getUserData for uniqueIdentifier=${uniqueIdentifier}: ${err.message}`
        );
        socket.emit('error', { message: 'Database error fetching user data' });
        return;
      }

      if (!user) {
        logger.warn(
          `User not found in getUserData for uniqueIdentifier=${uniqueIdentifier}`
        );
        socket.emit('error', { message: 'User not found' });
        return;
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
        logger.error('Database error in getUserName:', err.message);
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
            logger.error('User data error in getUserName:', err.message);
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
        logger.error('Database error in getPixelColor:', err.message);
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
               placedPixels = placedPixels + 1,
               rewardPlacedPixels = rewardPlacedPixels + 1 
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
      logger.error('Database error in setDrawPixel:', updateErr.message);
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
        logger.error('Ошибка при запросе maxPixelCount:', err.message);
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

function updateMaxPixelCount(uniqueIdentifier, newMaxPixelCount, socket) {
  const subscriptionTime = moment()
    .add(14, 'days')
    .format('YYYY-MM-DD HH:mm:ss');

  db.run(
    'UPDATE Users SET maxPixelCount = ?, subscription = 1, subscriptionTime = ? WHERE uniqueIdentifier = ?',
    [newMaxPixelCount, subscriptionTime, uniqueIdentifier],
    function (err) {
      if (err) {
        logger.error('Error updating maxPixelCount:', err.message);
        if (typeof socket === 'function') {
          socket({ success: false, message: 'Database update failed' });
        }
        return;
      }

      if (this.changes > 0) {
        if (typeof socket === 'function') {
          socket({ success: true });
        } else {
          socket.emit('max-pixel-count-update', {
            maxPixelCount: newMaxPixelCount,
          });
        }
      } else {
        if (typeof socket === 'function') {
          socket({
            success: false,
            message: 'No user found with the given uniqueIdentifier',
          });
        }
      }
    }
  );
}

function updateColorSubscription(
  uniqueIdentifier,
  isColorSubscription,
  socketOrCallback
) {
  const subscriptionTime = moment()
    .add(14, 'days')
    .format('YYYY-MM-DD HH:mm:ss');

  db.run(
    'UPDATE Users SET isColorSubscription = ?, isColorSubscriptionTime = ? WHERE uniqueIdentifier = ?',
    [isColorSubscription ? 1 : 0, subscriptionTime, uniqueIdentifier],
    function (err) {
      if (err) {
        logger.error('Error updating isColorSubscription:', err.message);
        if (typeof socketOrCallback === 'function') {
          socketOrCallback({
            success: false,
            message: 'Database update failed',
          });
        } else if (
          socketOrCallback &&
          typeof socketOrCallback.emit === 'function'
        ) {
          socketOrCallback.emit('error', { message: 'Database update failed' });
        }
        return;
      }

      if (this.changes > 0) {
        if (typeof socketOrCallback === 'function') {
          socketOrCallback({ success: true });
        } else if (
          socketOrCallback &&
          typeof socketOrCallback.emit === 'function'
        ) {
          socketOrCallback.emit('color-subscription-update', {
            isColorSubscription: isColorSubscription ? 1 : 0,
          });
        }
      } else {
        if (typeof socketOrCallback === 'function') {
          socketOrCallback({
            success: false,
            message: 'No user found with the given uniqueIdentifier',
          });
        } else if (
          socketOrCallback &&
          typeof socketOrCallback.emit === 'function'
        ) {
          socketOrCallback.emit('error', {
            message: 'No user found with the given uniqueIdentifier',
          });
        }
      }
    }
  );
}

function getColorSubscription(uniqueIdentifier, socket) {
  db.get(
    'SELECT isColorSubscription FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, row) => {
      if (err) {
        logger.error('Ошибка при запросе isColorSubscription:', err.message);
        return;
      }

      if (row) {
        socket.emit('color-subscription-update', {
          isColorSubscription: row.isColorSubscription,
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
        logger.error('Ошибка запроса Leaderboard:', err.message);
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
        logger.error('Ошибка запроса Leaderboard:', err.message);
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
        logger.error('Ошибка запроса Leaderboard:', err.message);
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
        logger.error('Ошибка запроса Leaderboard:', err.message);
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
        logger.error('Ошибка при запросе placedPixels:', err.message);
        return;
      }

      if (row) {
        socket.emit('placed-pixels-update', {
          placedPixels: row.placedPixels,
        });
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
        logger.error('Ошибка при запросе username:', err.message);
        return;
      }

      if (!userRow) {
        return;
      }

      const username = userRow.username;

      db.get(
        'SELECT placedPixels FROM Leaderboard2 WHERE username = ?',
        [username],
        (err, lbRow) => {
          if (err) {
            logger.error('Ошибка при запросе Leaderboard2:', err.message);
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
            logger.error('Ошибка при запросе Leaderboard3:', err.message);
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
            logger.error('Ошибка при запросе Leaderboard4:', err.message);
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
        logger.error('Ошибка при запросе username:', err.message);
        socket.emit('error', { message: 'Database error fetching username' });
        return;
      }

      if (!userRow) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      const username = userRow.username;

      db.get(
        'SELECT * FROM Achievements WHERE username = ?',
        [username],
        (err, achievementsRow) => {
          if (err) {
            logger.error('Ошибка при запросе Achievements:', err.message);
            socket.emit('error', {
              message: 'Database error fetching achievements',
            });
            return;
          }

          if (!achievementsRow) {
            db.run(
              'INSERT OR IGNORE INTO Achievements (username) VALUES (?)',
              [username],
              (err) => {
                if (err) {
                  logger.error(
                    'Ошибка при создании записи Achievements:',
                    err.message
                  );
                  socket.emit('error', {
                    message: 'Database error creating achievement record',
                  });
                  return;
                }
                db.get(
                  'SELECT * FROM Achievements WHERE username = ?',
                  [username],
                  (err, newAchievementsRow) => {
                    if (err) {
                      logger.error(
                        'Ошибка при повторном запросе Achievements:',
                        err.message
                      );
                      socket.emit('error', {
                        message: 'Database error fetching achievements',
                      });
                      return;
                    }
                    socket.emit(
                      'achievements-user-data',
                      newAchievementsRow || {}
                    );
                  }
                );
              }
            );
            return;
          }

          socket.emit('achievements-user-data', achievementsRow);
        }
      );
    }
  );
}

function claimAchievementReward(
  uniqueIdentifier,
  achievement,
  coins,
  socket,
  callback
) {
  const validAchievements = [
    'firstAchive',
    'secondAchive',
    'thirdAchive',
    'fourthAchive',
    'fifthAchive',
  ];
  if (!validAchievements.includes(achievement)) {
    logger.error(`Недопустимое значение achievement: ${achievement}`);
    callback({ success: false, message: 'Invalid achievement key' });
    return;
  }

  db.get(
    'SELECT username FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, userRow) => {
      if (err) {
        logger.error('Ошибка при запросе username:', err.message);
        callback({
          success: false,
          message: 'Database error fetching username',
        });
        return;
      }

      if (!userRow) {
        callback({ success: false, message: 'User not found' });
        return;
      }

      const username = userRow.username;
      const achievementColumn = `${achievement}Claimed`;

      db.get(
        `SELECT ${achievement}, ${achievementColumn} FROM Achievements WHERE username = ?`,
        [username],
        (err, row) => {
          if (err) {
            logger.error('Ошибка при запросе Achievements:', err.message);
            callback({
              success: false,
              message: 'Database error fetching achievements',
            });
            return;
          }

          if (!row) {
            db.run(
              'INSERT OR IGNORE INTO Achievements (username) VALUES (?)',
              [username],
              (err) => {
                if (err) {
                  logger.error(
                    'Ошибка при создании записи Achievements:',
                    err.message
                  );
                  callback({
                    success: false,
                    message: 'Database error creating achievement record',
                  });
                  return;
                }
                db.get(
                  `SELECT ${achievement}, ${achievementColumn} FROM Achievements WHERE username = ?`,
                  [username],
                  (err, newRow) => {
                    if (err) {
                      logger.error(
                        'Ошибка при повторном запросе Achievements:',
                        err.message
                      );
                      callback({
                        success: false,
                        message: 'Database error fetching achievements',
                      });
                      return;
                    }

                    if (
                      !newRow ||
                      newRow[achievement] !== 1 ||
                      newRow[achievementColumn] === 1
                    ) {
                      callback({
                        success: false,
                        message: 'Reward not available or already claimed',
                      });
                      return;
                    }

                    updateAchievementReward(
                      uniqueIdentifier,
                      username,
                      achievement,
                      achievementColumn,
                      coins,
                      socket,
                      callback
                    );
                  }
                );
              }
            );
            return;
          }

          if (!row || row[achievement] !== 1 || row[achievementColumn] === 1) {
            callback({
              success: false,
              message: 'Reward not available or already claimed',
            });
            return;
          }

          updateAchievementReward(
            uniqueIdentifier,
            username,
            achievement,
            achievementColumn,
            coins,
            socket,
            callback
          );
        }
      );
    }
  );
}

function updateAchievementReward(
  uniqueIdentifier,
  username,
  achievement,
  achievementColumn,
  coins,
  socket,
  callback
) {
  db.run(
    `UPDATE Achievements SET ${achievementColumn} = 1 WHERE username = ?`,
    [username],
    (err) => {
      if (err) {
        logger.error(
          `Ошибка при обновлении Achievements для ${achievementColumn}: ${err.message}`
        );
        callback({
          success: false,
          message: `Database error updating ${achievementColumn}`,
        });
        return;
      }

      if (this.changes === 0) {
        logger.warn(
          `Запись в Achievements для username=${username} не обновлена`
        );
        callback({ success: false, message: 'No achievement record updated' });
        return;
      }

      db.run(
        'UPDATE Users SET coins = coins + ? WHERE uniqueIdentifier = ?',
        [coins, uniqueIdentifier],
        (err) => {
          if (err) {
            logger.error('Ошибка при обновлении coins:', err.message);
            callback({
              success: false,
              message: 'Database error updating coins',
            });
            return;
          }

          getUserCoins(uniqueIdentifier, socket);
          callback({ success: true });
        }
      );
    }
  );
}

function claimDailyReward(uniqueIdentifier, reward, coins, socket, callback) {
  const rewardColumn = `${reward}Claimed`;
  const lastClaimedColumn = `${reward}LastClaimed`;
  db.get(
    'SELECT username FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, userRow) => {
      if (err) {
        logger.error('Ошибка при запросе username:', err.message);
        callback({ success: false, message: 'Database error' });
        return;
      }

      if (!userRow) {
        callback({ success: false, message: 'User not found' });
        return;
      }

      const username = userRow.username;

      db.get(
        `SELECT ${reward}Completed, ${rewardColumn}, ${lastClaimedColumn} FROM DailyRewards WHERE username = ?`,
        [username],
        (err, row) => {
          if (err) {
            logger.error('Ошибка при запросе DailyRewards:', err.message);
            callback({ success: false, message: 'Database error' });
            return;
          }

          if (
            !row ||
            row[`${reward}Completed`] !== 1 ||
            row[rewardColumn] === 1
          ) {
            callback({
              success: false,
              message: 'Reward not available or already claimed',
            });
            return;
          }

          const lastClaimed = moment().format('YYYY-MM-DD HH:mm:ss');
          db.run(
            `UPDATE DailyRewards SET ${rewardColumn} = 1, ${lastClaimedColumn} = ? WHERE username = ?`,
            [lastClaimed, username],
            (err) => {
              if (err) {
                logger.error(
                  'Ошибка при обновлении DailyRewards:',
                  err.message
                );
                callback({ success: false, message: 'Database error' });
                return;
              }

              db.run(
                'UPDATE Users SET coins = coins + ? WHERE uniqueIdentifier = ?',
                [coins, uniqueIdentifier],
                (err) => {
                  if (err) {
                    logger.error('Ошибка при обновлении coins:', err.message);
                    callback({ success: false, message: 'Database error' });
                    return;
                  }

                  getUserCoins(uniqueIdentifier, socket);
                  callback({ success: true });
                }
              );
            }
          );
        }
      );
    }
  );
}

function getDailyRewards(uniqueIdentifier, socket) {
  db.get(
    'SELECT username FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, userRow) => {
      if (err) {
        logger.error('Ошибка при запросе username:', err.message);
        socket.emit('error', { message: 'Database error fetching username' });
        return;
      }

      if (!userRow) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      const username = userRow.username;

      db.get(
        'SELECT * FROM DailyRewards WHERE username = ?',
        [username],
        (err, row) => {
          if (err) {
            logger.error('Ошибка при запросе DailyRewards:', err.message);
            socket.emit('error', {
              message: 'Database error fetching daily rewards',
            });
            return;
          }

          if (!row) {
            db.run(
              'INSERT OR IGNORE INTO DailyRewards (username) VALUES (?)',
              [username],
              (err) => {
                if (err) {
                  logger.error(
                    'Ошибка при создании записи DailyRewards:',
                    err.message
                  );
                  socket.emit('error', {
                    message: 'Database error creating daily rewards record',
                  });
                  return;
                }
                db.get(
                  'SELECT * FROM DailyRewards WHERE username = ?',
                  [username],
                  (err, newRow) => {
                    if (err) {
                      logger.error(
                        'Ошибка при повторном запросе DailyRewards:',
                        err.message
                      );
                      socket.emit('error', {
                        message: 'Database error fetching daily rewards',
                      });
                      return;
                    }
                    socket.emit('daily-rewards-data', newRow || {});
                  }
                );
              }
            );
            return;
          }

          socket.emit('daily-rewards-data', row);
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
        logger.error('Ошибка получения данных пользователя:', err.message);
        socket.emit('username-data', {
          success: false,
          error: 'Database error',
        });
        return;
      }
      if (!row) {
        socket.emit('username-data', {
          success: false,
          error: 'User not found',
        });
        return;
      }
      socket.emit('username-data', {
        success: true,
        username: row.username,
        email: row.email,
      });
    }
  );
}

function getUserSeconds(uniqueIdentifier, socket) {
  db.get(
    `SELECT userPixelUpdateTime, boostExpirationTime FROM Users WHERE uniqueIdentifier = ?`,
    [uniqueIdentifier],
    (err, row) => {
      if (err) {
        logger.error(
          'Ошибка получения данных пользователя в getUserSeconds:',
          err.message
        );
        socket.emit('user-seconds-data', {
          success: false,
          error: 'Database error',
        });
        return;
      }
      if (!row) {
        socket.emit('user-seconds-data', {
          success: false,
          error: 'User not found',
        });
        return;
      }
      if (
        row.boostExpirationTime &&
        moment(row.boostExpirationTime).isBefore(moment())
      ) {
        db.run(
          'UPDATE Users SET userPixelUpdateTime = 10, boostExpirationTime = NULL WHERE uniqueIdentifier = ?',
          [uniqueIdentifier],
          (err) => {
            if (err) {
              logger.error(
                'Ошибка при сбросе буста в getUserSeconds:',
                err.message
              );
              return;
            }
            socket.emit('user-seconds-data', {
              success: true,
              userPixelUpdateTime: 10,
            });
            socket.emit('active-boost-update', { activeBoost: null });
          }
        );
      } else {
        socket.emit('user-seconds-data', {
          success: true,
          userPixelUpdateTime: row.userPixelUpdateTime,
        });
      }
    }
  );
}

function createSinglePlayerTable(uniqueIdentifier, callback) {
  const tableName = `SinglePlayer_${uniqueIdentifier}`;

  db.run(
    `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      x INTEGER,
      y INTEGER,
      color INTEGER,
      userId TEXT,
      created_at TEXT DEFAULT (datetime('now', '+3 hours')),
      PRIMARY KEY (x, y)
    ) WITHOUT ROWID;
  `,
    (err) => {
      if (err) {
        logger.error(
          `Error creating SinglePlayer table ${tableName}: ${err.message}`
        );
        return callback({ success: false, message: err.message });
      }

      logger.info(`SinglePlayer table ${tableName} created successfully`);
      callback({ success: true });
    }
  );
}

function undoLastPixel(uniqueIdentifier, route, socket, callback) {
  const tableName =
    route === '/canvas-1'
      ? 'Canvas'
      : route === '/canvas-2'
        ? 'Canvas2'
        : route === '/canvas-3'
          ? 'Canvas3'
          : route === '/single-player-game'
            ? `SinglePlayer_${uniqueIdentifier}`
            : null;

  if (!tableName) {
    logger.error('Invalid route for undoLastPixel:', route);
    return callback({ success: false, message: 'Invalid route' });
  }

  db.get(
    `SELECT lastPixelX, lastPixelY FROM Users WHERE uniqueIdentifier = ?`,
    [uniqueIdentifier],
    (err, userRow) => {
      if (err) {
        logger.error('Database error fetching last pixel:', err.message);
        return callback({ success: false, message: 'Database error' });
      }

      if (
        !userRow ||
        userRow.lastPixelX === null ||
        userRow.lastPixelY === null
      ) {
        return callback({ success: false, message: 'No last pixel found' });
      }

      const { lastPixelX, lastPixelY } = userRow;

      db.get(
        `SELECT userId FROM ${tableName} WHERE x = ? AND y = ?`,
        [lastPixelX, lastPixelY],
        (err, pixelRow) => {
          if (err) {
            logger.error(
              'Database error checking pixel ownership:',
              err.message
            );
            return callback({ success: false, message: 'Database error' });
          }

          if (!pixelRow || pixelRow.userId !== uniqueIdentifier) {
            return callback({
              success: false,
              message: 'Pixel does not belong to user or not found',
            });
          }

          db.get(
            `SELECT pixelCount, maxPixelCount FROM Users WHERE uniqueIdentifier = ?`,
            [uniqueIdentifier],
            (err, countRow) => {
              if (err) {
                logger.error(
                  'Database error fetching pixel counts:',
                  err.message
                );
                return callback({ success: false, message: 'Database error' });
              }

              const { pixelCount, maxPixelCount } = countRow;
              const newPixelCount =
                pixelCount < maxPixelCount ? pixelCount + 1 : pixelCount;

              db.run(
                `DELETE FROM ${tableName} WHERE x = ? AND y = ?`,
                [lastPixelX, lastPixelY],
                function (err) {
                  if (err) {
                    logger.error('Database error deleting pixel:', err.message);
                    return callback({
                      success: false,
                      message: 'Database error deleting pixel',
                    });
                  }

                  if (this.changes === 0) {
                    logger.warn(
                      `No pixel deleted for x=${lastPixelX}, y=${lastPixelY} in table ${tableName}`
                    );
                    return callback({
                      success: false,
                      message: 'No pixel deleted',
                    });
                  }

                  db.run(
                    `UPDATE Users SET pixelCount = ?, lastPixelX = NULL, lastPixelY = NULL WHERE uniqueIdentifier = ?`,
                    [newPixelCount, uniqueIdentifier],
                    function (err) {
                      if (err) {
                        logger.error(
                          'Database error updating user data:',
                          err.message
                        );
                        return callback({
                          success: false,
                          message: 'Database error updating user data',
                        });
                      }

                      sendUserPixelCount(socket, uniqueIdentifier);
                      const eventName =
                        route === '/single-player-game'
                          ? 'pixel-undo-single'
                          : `pixel-undo-${route.slice(-1)}`;
                      socket
                        .to(
                          tableName === `SinglePlayer_${uniqueIdentifier}`
                            ? `single_${uniqueIdentifier}`
                            : tableName.toLowerCase()
                        )
                        .emit(eventName, { x: lastPixelX, y: lastPixelY });
                      socket.emit(eventName, { x: lastPixelX, y: lastPixelY });
                      callback({ success: true });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}

function getUserColorSubscription(uniqueIdentifier, socket) {
  db.get(
    'SELECT isColorSubscription FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, row) => {
      if (err) {
        logger.error('Ошибка при запросе isColorSubscription:', err.message);
        return;
      }

      if (row) {
        socket.emit('user-color-sub-data', {
          isColorSubscription: row.isColorSubscription,
        });
      }
    }
  );
}

function getUserCoins(uniqueIdentifier, socket) {
  db.get(
    'SELECT coins FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, row) => {
      if (err) {
        logger.error('Ошибка при запросе coins:', err.message);
        return;
      }

      if (row) {
        socket.emit('user-coins', {
          coins: row.coins,
        });
      }
    }
  );
}

function purchaseBoost(
  uniqueIdentifier,
  boostName,
  cost,
  updateTime,
  duration,
  socket,
  callback
) {
  db.get(
    'SELECT coins FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, userRow) => {
      if (err) {
        logger.error(
          `Ошибка при запросе данных пользователя в purchaseBoost: ${err.message}`
        );
        callback({
          success: false,
          message: 'Database error fetching user data',
        });
        return;
      }

      if (!userRow) {
        logger.warn(
          `Пользователь с uniqueIdentifier=${uniqueIdentifier} не найден`
        );
        callback({ success: false, message: 'User not found' });
        return;
      }

      if (userRow.coins < cost) {
        logger.info(
          `Недостаточно монет для покупки буста: ${boostName}, пользователь: ${uniqueIdentifier}`
        );
        callback({
          success: false,
          message: 'Недостаточно монет для покупки буста',
        });
        return;
      }

      const expirationTime = moment()
        .add(duration, 'seconds')
        .format('YYYY-MM-DD HH:mm:ss');

      db.run(
        `UPDATE Users SET coins = coins - ?, userPixelUpdateTime = ?, boostExpirationTime = ? WHERE uniqueIdentifier = ?`,
        [cost, updateTime, expirationTime, uniqueIdentifier],
        function (err) {
          if (err) {
            logger.error(
              `Ошибка при обновлении буста для ${uniqueIdentifier}: ${err.message}`
            );
            callback({
              success: false,
              message: 'Database error updating boost',
            });
            return;
          }

          if (this.changes === 0) {
            logger.warn(
              `Запись для пользователя ${uniqueIdentifier} не обновлена`
            );
            callback({ success: false, message: 'No user record updated' });
            return;
          }

          logger.info(
            `Буст ${boostName} успешно куплен для пользователя ${uniqueIdentifier}`
          );
          socket.emit('active-boost-update', {
            activeBoost: { name: boostName, updateTime, expirationTime },
          });
          socket.emit('user-coins', { coins: userRow.coins - cost });
          socket.emit('user-seconds-data', {
            success: true,
            userPixelUpdateTime: updateTime,
          });
          callback({ success: true });
        }
      );
    }
  );
}

function getActiveBoost(uniqueIdentifier, socket) {
  db.get(
    'SELECT userPixelUpdateTime, boostExpirationTime FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, row) => {
      if (err) {
        logger.error(
          `Ошибка при запросе активного буста для ${uniqueIdentifier}: ${err.message}`
        );
        socket.emit('error', {
          message: 'Database error fetching active boost',
        });
        return;
      }

      if (!row) {
        logger.warn(
          `Пользователь с uniqueIdentifier=${uniqueIdentifier} не найден`
        );
        socket.emit('error', { message: 'User not found' });
        return;
      }

      let activeBoost = null;
      if (
        row.boostExpirationTime &&
        moment(row.boostExpirationTime).isAfter(moment())
      ) {
        const updateTime = row.userPixelUpdateTime;
        const boost = boostMap.find(
          (b) =>
            b.updateTime === updateTime &&
            moment(row.boostExpirationTime).isSameOrBefore(
              moment().add(b.duration, 'seconds')
            )
        );
        if (boost) {
          activeBoost = {
            name: boost.name,
            updateTime: row.userPixelUpdateTime,
            expirationTime: row.boostExpirationTime,
          };
        }
      } else if (row.boostExpirationTime) {
        db.run(
          'UPDATE Users SET userPixelUpdateTime = 10, boostExpirationTime = NULL WHERE uniqueIdentifier = ?',
          [uniqueIdentifier],
          (err) => {
            if (err) {
              logger.error(
                `Ошибка при сбросе буста для ${uniqueIdentifier}: ${err.message}`
              );
              return;
            }
            logger.info(`Буст для пользователя ${uniqueIdentifier} сброшен`);
            socket.emit('user-seconds-data', {
              success: true,
              userPixelUpdateTime: 10,
            });
            socket.emit('active-boost-update', { activeBoost: null });
          }
        );
      }

      socket.emit('active-boost-update', { activeBoost });
    }
  );
}

function getUserColors(uniqueIdentifier, socket) {
  db.get(
    'SELECT userColors FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, row) => {
      if (err) {
        logger.error('Ошибка при запросе userColors:', err.message);
        return;
      }

      if (row) {
        try {
          const colors = row.userColors ? JSON.parse(row.userColors) : [];

          socket.emit('user-colors', {
            colors: colors,
          });
        } catch (parseError) {
          logger.error('Ошибка при парсинге userColors:', parseError.message);
          socket.emit('user-colors', {
            colors: [],
          });
        }
      } else {
        socket.emit('user-colors', {
          colors: [],
        });
      }
    }
  );
}

function getUserAccess(uniqueIdentifier, socket) {
  db.get(
    'SELECT access FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, row) => {
      if (err) {
        logger.error('Ошибка при запросе maxPixelCount:', err.message);
        return;
      }

      if (row) {
        socket.emit('user-access', {
          access: row.access,
        });
      }
    }
  );
}

function getCanPlacePixels(uniqueIdentifier, socket) {
  db.get(
    'SELECT canPlacePixel FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, row) => {
      if (err) {
        logger.error('Ошибка при запросе maxPixelCount:', err.message);
        return;
      }

      if (row) {
        socket.emit('user-canplace', {
          canPlacePixel: row.canPlacePixel,
        });
      }
    }
  );
}

function checkAndUnbanUsers(io) {
  db.all(
    `SELECT b.userId, b.banStartTime, u.uniqueIdentifier 
     FROM BanHistory b 
     JOIN Users u ON b.userId = u.id 
     WHERE b.banStartTime IS NOT NULL 
     AND u.canPlacePixel = 0 
     AND u.access = 1`,
    [],
    (err, rows) => {
      if (err) {
        logger.error(`Ошибка при проверке банов: ${err.message}`);
        return;
      }

      rows.forEach((row) => {
        if (moment(row.banStartTime).isBefore(moment().subtract(21, 'hours'))) {
          db.run(
            `UPDATE Users SET canPlacePixel = 1 WHERE id = ?`,
            [row.userId],
            (err) => {
              if (err) {
                logger.error(`Ошибка при снятии бана для userId ${row.userId}: ${err.message}`);
                return;
              }
              logger.info(`Бан снят для пользователя ${row.uniqueIdentifier}`);
              io.to(`user_${row.uniqueIdentifier}`).emit('user-canplace', {
                canPlacePixel: 1,
              });
            }
          );
        }
      });
    }
  );
}

module.exports = {
  setDrawPixel,
  getUserData,
  getMaxPixelCount,
  updateMaxPixelCount,
  updateColorSubscription,
  getColorSubscription,
  getUserName,
  getCanvasStatus,
  getLeaderboard,
  getPixelColor,
  getPlacedPixels,
  getPlacedPixelsCanvas1,
  getUserAchievement,
  getUsernameData,
  getUserSeconds,
  createSinglePlayerTable,
  undoLastPixel,
  getUserColorSubscription,
  getUserCoins,
  claimAchievementReward,
  claimDailyReward,
  getDailyRewards,
  purchaseBoost,
  getActiveBoost,
  getUserColors,
  purchaseColor,
  addUserCoins,
  getUserAccess,
  getCanPlacePixels,
  checkAndUnbanUsers,
};
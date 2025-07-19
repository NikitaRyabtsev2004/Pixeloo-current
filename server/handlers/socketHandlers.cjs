const { logger } = require('../utils/libs/logger.cjs');
const { handlePixelDraw } = require('../utils/pixel/handlePixelDraw.cjs');
const { sendUserPixelCount } = require('../utils/pixel/sendUserPixelCount.cjs');
const jwt = require('jsonwebtoken');
const moment = require('moment');
require('moment/locale/ru');
moment.locale('ru');

const {
  getMaxPixelCount,
  getUserData,
  getUserName,
  getCanvasStatus,
  updateMaxPixelCount,
  updateColorSubscription,
  setDrawPixel,
  getLeaderboard,
  getPixelColor,
  getPlacedPixels,
  getPlacedPixelsCanvas1,
  getUserAchievement,
  getUsernameData,
  createSinglePlayerTable,
  getUserSeconds,
  getUserColorSubscription,
  undoLastPixel,
  getUserCoins,
  claimAchievementReward,
  claimDailyReward,
  getDailyRewards,
  purchaseBoost,
  getActiveBoost,
  getUserColors,
  purchaseColor,
  addUserCoins,
} = require('../database/dbQueries.cjs');

const {
  checkAndEmitPixelStatus,
} = require('../utils/pixel/checkAndEmitPixelStatus.cjs');

const db = require('../database/dbSetup.cjs');

let lastGlobalReset = moment().subtract(240, 'minutes');
let chatMessages = [];

function handleSocketEvents(socket, io, onlineUsers) {
  let uniqueIdentifier = socket.handshake.auth.uniqueIdentifier || 'guest';
  let currentRoute;
  let updateIntervalId = null;

  if (!socket.user) {
    socket.user = { isGuest: true };
  }

  try {
    if (socket.handshake.auth.token && socket.handshake.auth.uniqueIdentifier) {
      db.get(
        'SELECT * FROM Users WHERE uniqueIdentifier = ? AND authToken = ? AND authTokenExpires > ?',
        [
          socket.handshake.auth.uniqueIdentifier,
          socket.handshake.auth.token,
          Date.now(),
        ],
        (err, user) => {
          try {
            if (err || !user) {
              socket.user = { isGuest: true };
              socket.emit('access-denied', {
                message: 'Недействительный токен или сессия истекла.',
              });
              return;
            }

            jwt.verify(
              socket.handshake.auth.token,
              process.env.JWT_SECRET,
              (err) => {
                try {
                  if (err) {
                    socket.user = { isGuest: true };
                    socket.emit('access-denied', { message: 'Токен истек.' });
                    return;
                  }
                  socket.user.isGuest = false;
                } catch (err) {
                  logger.error(`Error in JWT verification: ${err.message}`);
                  socket.emit('access-denied', { message: 'Ошибка проверки токена.' });
                }
              }
            );
          } catch (err) {
            logger.error(`Error in token validation: ${err.message}`);
            socket.emit('access-denied', { message: 'Ошибка сервера.' });
          }
        }
      );
    }

    const checkSubscriptions = () => {
      try {
        const now = moment();
        db.all(
          'SELECT uniqueIdentifier, subscriptionTime, isColorSubscriptionTime, maxPixelCount, isColorSubscription, boostExpirationTime, userPixelUpdateTime FROM Users WHERE subscriptionTime IS NOT NULL OR isColorSubscriptionTime IS NOT NULL OR boostExpirationTime IS NOT NULL',
          [],
          (err, users) => {
            try {
              if (err) {
                logger.error('Ошибка при проверке подписок:', err.message);
                return;
              }

              users.forEach((user) => {
                try {
                  const {
                    uniqueIdentifier,
                    subscriptionTime,
                    isColorSubscriptionTime,
                    maxPixelCount,
                    isColorSubscription,
                    boostExpirationTime,
                    userPixelUpdateTime,
                  } = user;

                  if (
                    subscriptionTime &&
                    moment(subscriptionTime).isBefore(now) &&
                    maxPixelCount > 100
                  ) {
                    db.run(
                      'UPDATE Users SET subscription = 0, maxPixelCount = 100, subscriptionTime = NULL WHERE uniqueIdentifier = ?',
                      [uniqueIdentifier],
                      (err) => {
                        if (err) {
                          logger.error(
                            'Ошибка при сбросе подписки на пиксели:',
                            err.message
                          );
                          return;
                        }
                        logger.info(
                          `Подписка на пиксели для пользователя ${uniqueIdentifier} сброшена`
                        );
                        io.to(`user_${uniqueIdentifier}`).emit(
                          'max-pixel-count-update',
                          {
                            maxPixelCount: 100,
                          }
                        );
                      }
                    );
                  }

                  if (
                    isColorSubscriptionTime &&
                    moment(isColorSubscriptionTime).isBefore(now) &&
                    isColorSubscription === 1
                  ) {
                    db.run(
                      'UPDATE Users SET isColorSubscription = 0, isColorSubscriptionTime = NULL WHERE uniqueIdentifier = ?',
                      [uniqueIdentifier],
                      (err) => {
                        if (err) {
                          logger.error(
                            'Ошибка при сбросе подписки на выбор цвета:',
                            err.message
                          );
                          return;
                        }
                        logger.info(
                          `Подписка на выбор цвета для пользователя ${uniqueIdentifier} сброшена`
                        );
                        io.to(`user_${uniqueIdentifier}`).emit(
                          'color-subscription-update',
                          {
                            isColorSubscription: 0,
                          }
                        );
                      }
                    );
                  }

                  if (
                    boostExpirationTime &&
                    moment(boostExpirationTime).isBefore(now) &&
                    userPixelUpdateTime !== 10
                  ) {
                    db.run(
                      'UPDATE Users SET userPixelUpdateTime = 10, boostExpirationTime = NULL WHERE uniqueIdentifier = ?',
                      [uniqueIdentifier],
                      (err) => {
                        if (err) {
                          logger.error('Ошибка при сбросе буста:', err.message);
                          return;
                        }
                        logger.info(
                          `Буст для пользователя ${uniqueIdentifier} сброшен`
                        );
                        io.to(`user_${uniqueIdentifier}`).emit('active-boost-update', {
                          activeBoost: null,
                        });
                        io.to(`user_${uniqueIdentifier}`).emit('user-seconds-data', {
                          success: true,
                          userPixelUpdateTime: 10,
                        });
                      }
                    );
                  }
                } catch (err) {
                  logger.error(`Error processing user subscription for ${uniqueIdentifier}: ${err.message}`);
                }
              });

              if (now.diff(lastGlobalReset, 'minutes') >= 240) {
                db.run(
                  'UPDATE DailyRewards SET pixelRewardCompleted = 0, pixelRewardClaimed = 0, colorRewardCompleted = 0, colorRewardClaimed = 0, lastReset = ?',
                  [now.format('YYYY-MM-DD HH:mm:ss')],
                  (err) => {
                    try {
                      if (err) {
                        logger.error(
                          'Ошибка при глобальном сбросе ежедневных наград:',
                          err.message
                        );
                        return;
                      }
                      db.run(
                        'UPDATE Users SET rewardPlacedPixels = 0, rewardColorsUsed = ""',
                        (err) => {
                          try {
                            if (err) {
                              logger.error(
                                'Ошибка при сбросе rewardPlacedPixels и rewardColorsUsed:',
                                err.message
                              );
                              return;
                            }
                            logger.info('Ежедневные награды сброшены для всех пользователей');
                            io.emit('daily-rewards-reset');
                            lastGlobalReset = now;
                          } catch (err) {
                            logger.error(`Error resetting daily rewards: ${err.message}`);
                          }
                        }
                      );
                    } catch (err) {
                      logger.error(`Error in global daily rewards reset: ${err.message}`);
                    }
                  }
                );
              }
            } catch (err) {
              logger.error(`Error in checkSubscriptions: ${err.message}`);
            }
          }
        );
      } catch (err) {
        logger.error(`Error initializing checkSubscriptions: ${err.message}`);
      }
    };

    setInterval(checkSubscriptions, 10000);

    socket.on('update-token', ({ token }) => {
      try {
        if (socket.handshake.auth.uniqueIdentifier) {
          db.get(
            'SELECT * FROM Users WHERE uniqueIdentifier = ? AND authTokenExpires > ?',
            [socket.handshake.auth.uniqueIdentifier, Date.now()],
            (err, user) => {
              try {
                if (err || !user) {
                  socket.emit('access-denied', { message: 'Сессия истекла.' });
                  return;
                }
                jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                  try {
                    if (
                      err ||
                      decoded.uniqueIdentifier !==
                        socket.handshake.auth.uniqueIdentifier
                    ) {
                      socket.emit('access-denied', {
                        message: 'Недействительный токен.',
                      });
                      return;
                    }
                    socket.handshake.auth.token = token;
                    socket.user.isGuest = false;
                  } catch (err) {
                    logger.error(`Error in update-token JWT verification: ${err.message}`);
                    socket.emit('access-denied', { message: 'Ошибка проверки токена.' });
                  }
                });
              } catch (err) {
                logger.error(`Error in update-token user check: ${err.message}`);
                socket.emit('access-denied', { message: 'Ошибка сервера.' });
              }
            }
          );
        }
      } catch (err) {
        logger.error(`Error in update-token handler: ${err.message}`);
        socket.emit('access-denied', { message: 'Ошибка сервера.' });
      }
    });

    socket.emit('server-status', { status: 'online' });

    socket.on('client-info', (data) => {
      try {
        if (socket.user.isGuest) {
          return;
        }

        uniqueIdentifier = data.uniqueIdentifier;
        socket.join(`user_${uniqueIdentifier}`);

        createSinglePlayerTable(uniqueIdentifier, (result) => {
          try {
            if (!result.success) {
              logger.error(
                `Failed to create single-player table for ${uniqueIdentifier}: ${result.message}`
              );
            }
          } catch (err) {
            logger.error(`Error in createSinglePlayerTable callback: ${err.message}`);
          }
        });

        getUserData(uniqueIdentifier, socket);
        sendUserPixelCount(socket, uniqueIdentifier);

        if (updateIntervalId) {
          clearInterval(updateIntervalId);
          updateIntervalId = null;
        }

        db.get(
          'SELECT id, uniqueIdentifier, pixelCount, maxPixelCount, userPixelUpdateTime FROM Users WHERE uniqueIdentifier = ?',
          [uniqueIdentifier],
          (err, user) => {
            try {
              if (err) {
                logger.error(`Database error in client-info: ${err.message}`);
                return;
              }

              const updateTime =
                user && user.userPixelUpdateTime > 0
                  ? user.userPixelUpdateTime * 1000
                  : 5000;

              updateIntervalId = setInterval(() => {
                try {
                  if (user) {
                    checkAndEmitPixelStatus(socket, uniqueIdentifier);
                    getMaxPixelCount(uniqueIdentifier, socket);
                    sendUserPixelCount(socket, uniqueIdentifier);
                    getDailyRewards(uniqueIdentifier, socket);
                    io.emit('user-count', {
                      totalUsers: Object.keys(onlineUsers).length || 0,
                      totalConnections:
                        Object.values(onlineUsers).reduce(
                          (total, connections) => total + (connections?.length || 0),
                          0
                        ) || 0,
                    });
                  }
                } catch (err) {
                  logger.error(`Error in client-info interval: ${err.message}`);
                }
              }, updateTime);
            } catch (err) {
              logger.error(`Error in client-info user fetch: ${err.message}`);
            }
          }
        );
      } catch (err) {
        logger.error(`Error in client-info handler: ${err.message}`);
      }
    });

    socket.on('check-server-status', (callback) => {
      try {
        if (typeof callback === 'function') {
          callback({ status: 'online' });
        }
      } catch (err) {
        logger.error(`Error in check-server-status: ${err.message}`);
      }
    });

    socket.on('disconnect', () => {
      try {
        if (updateIntervalId) {
          clearInterval(updateIntervalId);
          updateIntervalId = null;
        }
        socket.leave(`user_${uniqueIdentifier}`);
        io.emit('user-count', {
          totalUsers: Object.keys(onlineUsers).length || 0,
          totalConnections:
            Object.values(onlineUsers).reduce(
              (total, connections) => total + (connections?.length || 0),
              0
            ) || 0,
        });
      } catch (err) {
        logger.error(`Error in disconnect handler: ${err.message}`);
      }
    });

    socket.on('join-room', (room) => {
      try {
        socket.join(room);
      } catch (err) {
        logger.error(`Error in join-room: ${err.message}`);
      }
    });

    socket.on('leave-room', (room) => {
      try {
        socket.leave(room);
      } catch (err) {
        logger.error(`Error in leave-room: ${err.message}`);
      }
    });

    const getTableName = (route, uniqueIdentifier) => {
      try {
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
      } catch (err) {
        logger.error(`Error in getTableName: ${err.message}`);
        return null;
      }
    };

    socket.on('route', (route) => {
      try {
        currentRoute = route;

        socket.rooms.forEach((room) => {
          try {
            if (room !== socket.id && room !== `user_${uniqueIdentifier}`) {
              socket.leave(room);
            }
          } catch (err) {
            logger.error(`Error leaving room ${room}: ${err.message}`);
          }
        });

        let roomName;
        if (route === '/single-player-game') {
          if (!socket.user.isGuest) {
            roomName = `single_${uniqueIdentifier}`;
            socket.join(roomName);
          }
          const canvasName = getTableName(route, uniqueIdentifier);
          if (canvasName) {
            getCanvasStatus(canvasName, socket, route);
          }
        } else {
          roomName =
            route === '/canvas-1'
              ? 'canvas1'
              : route === '/canvas-2'
                ? 'canvas2'
                : route === '/canvas-3'
                  ? 'canvas3'
                  : 'canvas1';
          socket.join(roomName);

          const canvasName = getTableName(route, uniqueIdentifier);
          if (canvasName) {
            getCanvasStatus(canvasName, socket, route);
          }
        }

        socket.emit('route-access-granted', {
          route,
          status: 'access-granted',
          message: 'Route accessible',
        });
      } catch (err) {
        logger.error(`Error in route handler: ${err.message}`);
      }
    });

    socket.on('get-username', (data, callback) => {
      try {
        const { x, y } = data;
        const tableName = getTableName(currentRoute, uniqueIdentifier);
        getUserName(tableName, callback, x, y, uniqueIdentifier);
      } catch (err) {
        logger.error(`Error in get-username: ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Server error' });
        }
      }
    });

    socket.on('get-pixel-color', (data, callback) => {
      try {
        const { x, y } = data;
        const tableName = getTableName(currentRoute, uniqueIdentifier);
        getPixelColor(tableName, callback, x, y);
      } catch (err) {
        logger.error(`Error in get-pixel-color: ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Server error' });
        }
      }
    });

    socket.on('draw-pixel', async (pixelData) => {
      try {
        if (socket.user.isGuest) {
          socket.emit('error', { message: 'Guests cannot draw pixels' });
          return;
        }

        const currentIdentifier = socket.handshake.auth.uniqueIdentifier;
        const { x, y, color, userId = currentIdentifier } = pixelData;

        if (!currentRoute) {
          throw new Error('Current route is not defined');
        }

        if (['/canvas-1', '/canvas-2', '/canvas-3'].includes(currentRoute)) {
          await handlePixelDraw(x, y, color, userId, io, currentRoute);
        } else if (currentRoute === '/single-player-game') {
          if (!currentIdentifier || currentIdentifier === 'undefined') {
            throw new Error('Invalid uniqueIdentifier for single-player game');
          }
          await handlePixelDraw(
            x,
            y,
            color,
            userId,
            io,
            currentRoute,
            currentIdentifier
          );
        } else {
          throw new Error(`Unknown route: ${currentRoute}`);
        }

        setDrawPixel(currentIdentifier, socket, currentRoute);
      } catch (err) {
        logger.error(
          // eslint-disable-next-line no-undef
          `Error drawing pixel: ${err.message}, route=${currentRoute}, identifier=${currentIdentifier}`
        );
        socket.emit('error', {
          message: 'Error drawing pixel',
          details: err.message,
        });
      }
    });

    socket.on('get-max-pixel-count', () => {
      try {
        if (socket.user.isGuest) {
          socket.emit('max-pixel-count', { maxPixelCount: 0 });
          return;
        }
        getMaxPixelCount(uniqueIdentifier, socket);
      } catch (err) {
        logger.error(`Error in get-max-pixel-count: ${err.message}`);
      }
    });

    socket.on('update-max-pixel-count', (data, callback) => {
      try {
        if (socket.user.isGuest) {
          callback({
            success: false,
            message: 'Guests cannot update max pixel count',
          });
          return;
        }
        const { newMaxPixelCount } = data;
        if (!newMaxPixelCount || typeof newMaxPixelCount !== 'number') {
          callback({
            success: false,
            message: 'Invalid maxPixelCount value',
          });
          return;
        }

        updateMaxPixelCount(uniqueIdentifier, newMaxPixelCount, callback);
      } catch (err) {
        logger.error(`Error in update-max-pixel-count: ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Server error' });
        }
      }
    });

    socket.on('update-color-subscription', (data, callback) => {
      try {
        if (socket.user.isGuest) {
          if (typeof callback === 'function') {
            callback({
              success: false,
              message: 'Guests cannot update color subscription',
            });
          }
          return;
        }

        const { isColorSubscription } = data;
        if (typeof isColorSubscription !== 'boolean') {
          if (typeof callback === 'function') {
            callback({
              success: false,
              message: 'Invalid isColorSubscription value',
            });
          }
          return;
        }

        const handleResponse = (response) => {
          try {
            if (response.success) {
              io.to(`user_${uniqueIdentifier}`).emit('color-subscription-update', {
                isColorSubscription: isColorSubscription ? 1 : 0,
              });
            }

            if (typeof callback === 'function') {
              callback(response);
            }
          } catch (err) {
            logger.error(`Error in update-color-subscription response: ${err.message}`);
          }
        };

        updateColorSubscription(
          uniqueIdentifier,
          isColorSubscription,
          handleResponse
        );
      } catch (err) {
        logger.error(`Error in update-color-subscription: ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Server error' });
        }
      }
    });

    socket.on('get-leaderboard', () => {
      try {
        getLeaderboard(socket);
      } catch (err) {
        logger.error(`Error in get-leaderboard: ${err.message}`);
      }
    });

    socket.on('requestTotalAmount', () => {
      try {
        if (socket.user.isGuest) {
          socket.emit('placed-pixels', { count: 0 });
          socket.emit('placed-pixels-canvas1', { count: 0 });
          return;
        }
        getPlacedPixels(uniqueIdentifier, socket);
        getPlacedPixelsCanvas1(uniqueIdentifier, socket);
      } catch (err) {
        logger.error(`Error in requestTotalAmount: ${err.message}`);
      }
    });

    socket.on('get-achievements-user-data', () => {
      try {
        if (socket.user.isGuest) {
          socket.emit('achievements-user-data', { achievements: [] });
          return;
        }
        getUserAchievement(uniqueIdentifier, socket);
      } catch (err) {
        logger.error(`Error in get-achievements-user-data: ${err.message}`);
      }
    });

    socket.on('get-username-data', () => {
      try {
        if (socket.user.isGuest) {
          socket.emit('username-data', { username: 'Guest' });
          return;
        }
        getUsernameData(uniqueIdentifier, socket);
      } catch (err) {
        logger.error(`Error in get-username-data: ${err.message}`);
      }
    });

    socket.on('user-increment-seconds', () => {
      try {
        if (socket.user.isGuest) {
          socket.emit('username-data', { seconds: '-' });
          return;
        }
        getUserSeconds(uniqueIdentifier, socket);
      } catch (err) {
        logger.error(`Error in user-increment-seconds: ${err.message}`);
      }
    });

    socket.on('get-color-input-sub', () => {
      try {
        if (socket.user.isGuest) {
          socket.emit('get-color-input-sub', { isColorSubscription: '' });
          return;
        }
        getUserColorSubscription(uniqueIdentifier, socket);
      } catch (err) {
        logger.error(`Error in get-color-input-sub: ${err.message}`);
      }
    });

    socket.on('get-coins', () => {
      try {
        if (socket.user.isGuest) {
          socket.emit('get-coins', { coins: '' });
          return;
        }
        getUserCoins(uniqueIdentifier, socket);
      } catch (err) {
        logger.error(`Error in get-coins: ${err.message}`);
      }
    });

    socket.on('undo-last-pixel', (callback) => {
      try {
        if (socket.user.isGuest) {
          if (typeof callback === 'function') {
            callback({
              success: false,
              message: 'Guests cannot undo pixels',
            });
          }
          return;
        }

        const currentIdentifier = socket.handshake.auth.uniqueIdentifier;
        if (!currentRoute) {
          if (typeof callback === 'function') {
            callback({
              success: false,
              message: 'Current route is not defined',
            });
          }
          return;
        }

        undoLastPixel(currentIdentifier, currentRoute, socket, (response) => {
          try {
            if (typeof callback === 'function') {
              callback(response);
            }
          } catch (err) {
            logger.error(`Error in undo-last-pixel callback: ${err.message}`);
          }
        });
      } catch (err) {
        logger.error(`Error in undo-last-pixel: ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Server error' });
        }
      }
    });

    socket.on('claim-achievement-reward', (data, callback) => {
      try {
        if (socket.user.isGuest) {
          callback({ success: false, message: 'Guests cannot claim rewards' });
          return;
        }
        claimAchievementReward(
          uniqueIdentifier,
          data.achievement,
          data.coins,
          socket,
          callback
        );
      } catch (err) {
        logger.error(`Error in claim-achievement-reward: ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Server error' });
        }
      }
    });

    socket.on('claim-daily-reward', (data, callback) => {
      try {
        if (socket.user.isGuest) {
          callback({ success: false, message: 'Guests cannot claim rewards' });
          return;
        }
        claimDailyReward(
          uniqueIdentifier,
          data.reward,
          data.coins,
          socket,
          callback
        );
      } catch (err) {
        logger.error(`Error in claim-daily-reward: ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Server error' });
        }
      }
    });

    socket.on('get-daily-rewards', () => {
      try {
        if (socket.user.isGuest) {
          socket.emit('daily-rewards-data', {});
          return;
        }
        getDailyRewards(uniqueIdentifier, socket);
      } catch (err) {
        logger.error(`Error in get-daily-rewards: ${err.message}`);
      }
    });

    socket.on('purchase-boost', (data, callback) => {
      try {
        if (socket.user.isGuest) {
          callback({ success: false, message: 'Guests cannot purchase boosts' });
          return;
        }

        const { boostName, cost, updateTime, duration } = data;
        if (
          !boostName ||
          typeof cost !== 'number' ||
          typeof updateTime !== 'number' ||
          typeof duration !== 'number'
        ) {
          callback({ success: false, message: 'Invalid boost data' });
          return;
        }

        purchaseBoost(
          uniqueIdentifier,
          boostName,
          cost,
          updateTime,
          duration,
          socket,
          callback
        );
      } catch (err) {
        logger.error(`Error in purchase-boost: ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Server error' });
        }
      }
    });

    socket.on('get-active-boost', () => {
      try {
        if (socket.user.isGuest) {
          socket.emit('active-boost-update', { activeBoost: null });
          return;
        }
        getActiveBoost(uniqueIdentifier, socket);
      } catch (err) {
        logger.error(`Error in get-active-boost: ${err.message}`);
      }
    });

    socket.on('get-user-colors', () => {
      try {
        if (socket.user.isGuest) {
          socket.emit('user-colors', { colors: null });
          return;
        }
        getUserColors(uniqueIdentifier, socket);
      } catch (err) {
        logger.error(`Error in get-user-colors: ${err.message}`);
      }
    });

    socket.on('purchase-color', ({ color }, callback) => {
      try {
        if (socket.user.isGuest) {
          callback({ success: false, message: 'Guests cannot purchase colors' });
          return;
        }
        purchaseColor(uniqueIdentifier, color, socket, callback);
      } catch (err) {
        logger.error(`Error in purchase-color: ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Server error' });
        }
      }
    });

    socket.on('purchase-coins', (data, callback) => {
      try {
        if (socket.user.isGuest) {
          callback({ success: false, message: 'Guests cannot purchase coins' });
          return;
        }

        const { coins } = data;
        if (!coins || typeof coins !== 'number' || coins <= 0) {
          callback({ success: false, message: 'Invalid coins value' });
          return;
        }

        logger.info(
          `Received purchase-coins for user ${uniqueIdentifier} with coins: ${coins}`
        );

        addUserCoins(uniqueIdentifier, coins, socket, (response) => {
          try {
            if (response.success) {
              logger.info(
                `Successfully added ${coins} coins for user ${uniqueIdentifier}. New balance: ${response.coins}`
              );
              socket.emit('user-coins', { coins: response.coins });
              io.to(`user_${uniqueIdentifier}`).emit('user-coins', {
                coins: response.coins,
              });
              callback({ success: true, coins: response.coins });
            } else {
              logger.error(
                `Failed to add coins for user ${uniqueIdentifier}: ${response.message}`
              );
              callback({ success: false, message: response.message });
            }
          } catch (err) {
            logger.error(`Error in purchase-coins callback: ${err.message}`);
            callback({ success: false, message: 'Server error' });
          }
        });
      } catch (err) {
        logger.error(`Error in purchase-coins: ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Server error' });
        }
      }
    });

    socket.on('get-messages', () => {
      try {
        socket.emit('chat-messages', { messages: chatMessages });
      } catch (err) {
        logger.error(`Error in get-messages: ${err.message}`);
      }
    });

    socket.on('send-message', (data, callback) => {
      try {
        if (socket.user.isGuest) {
          callback({ success: false, message: 'Guests cannot send messages' });
          return;
        }

        const { content, uniqueIdentifier, replyTo } = data;
        if (!content || content.length > 110) {
          callback({ success: false, message: 'Invalid message content' });
          return;
        }

        db.get(
          'SELECT username FROM Users WHERE uniqueIdentifier = ?',
          [uniqueIdentifier],
          (err, user) => {
            try {
              if (err || !user) {
                callback({ success: false, message: 'User not found' });
                return;
              }

              const message = {
                id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                content,
                username: user.username || 'Unknown',
                uniqueIdentifier,
                timestamp: Date.now(),
                replyTo: replyTo || null,
              };

              chatMessages.push(message);
              if (chatMessages.length > 200) {
                chatMessages.shift();
              }

              io.emit('new-message', message);
              callback({ success: true });
            } catch (err) {
              logger.error(`Error in send-message user fetch: ${err.message}`);
              callback({ success: false, message: 'Server error' });
            }
          }
        );
      } catch (err) {
        logger.error(`Error in send-message: ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Server error' });
        }
      }
    });

    socket.on('connect', () => {
      try {
        socket.join(`user_${uniqueIdentifier}`);
        io.emit('user-count', {
          totalUsers: Object.keys(onlineUsers).length || 0,
          totalConnections:
            Object.values(onlineUsers).reduce(
              (total, connections) => total + (connections?.length || 0),
              0
            ) || 0,
        });
      } catch (err) {
        logger.error(`Error in connect handler: ${err.message}`);
      }
    });

    // eslint-disable-next-line no-unused-vars
    socket.on('error', (error) => {
      try {
        socket.emit('server-error', { message: 'Server error occurred' });
      } catch (err) {
        logger.error(`Error in error handler: ${err.message}`);
      }
    });
  } catch (err) {
    logger.error(`Error initializing socket handlers: ${err.message}`);
  }
}

module.exports = { handleSocketEvents };
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
  getUserAccess,
  getCanPlacePixels,
  checkAndUnbanUsers,
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

  if (socket.handshake.auth.token && socket.handshake.auth.uniqueIdentifier) {
    db.get(
      'SELECT * FROM Users WHERE uniqueIdentifier = ? AND authToken = ? AND authTokenExpires > ?',
      [
        socket.handshake.auth.uniqueIdentifier,
        socket.handshake.auth.token,
        Date.now(),
      ],
      (err, user) => {
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
            if (err) {
              socket.user = { isGuest: true };
              socket.emit('access-denied', { message: 'Токен истек.' });
              return;
            }
            socket.user.isGuest = false;
          }
        );
      }
    );
  }

  const checkSubscriptions = () => {
    const now = moment();
    db.all(
      'SELECT uniqueIdentifier, subscriptionTime, isColorSubscriptionTime, maxPixelCount, isColorSubscription, boostExpirationTime, userPixelUpdateTime FROM Users WHERE subscriptionTime IS NOT NULL OR isColorSubscriptionTime IS NOT NULL OR boostExpirationTime IS NOT NULL',
      [],
      (err, users) => {
        if (err) {
          logger.error('Ошибка при проверке подписок:', err.message);
          return;
        }

        users.forEach((user) => {
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
        });
      }
    );

    if (now.diff(lastGlobalReset, 'minutes') >= 240) {
      db.run(
        'UPDATE DailyRewards SET pixelRewardCompleted = 0, pixelRewardClaimed = 0, colorRewardCompleted = 0, colorRewardClaimed = 0, lastReset = ?',
        [now.format('YYYY-MM-DD HH:mm:ss')],
        (err) => {
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
            }
          );
        }
      );
    }

    checkAndUnbanUsers(io);

    if (now.diff(lastGlobalReset, 'minutes') >= 240) {
      db.run(
        'UPDATE DailyRewards SET pixelRewardCompleted = 0, pixelRewardClaimed = 0, colorRewardCompleted = 0, colorRewardClaimed = 0, lastReset = ?',
        [now.format('YYYY-MM-DD HH:mm:ss')],
        (err) => {
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
            }
          );
        }
      );
    }
  };

  setInterval(checkSubscriptions, 10000);

  socket.on('update-token', ({ token }) => {
    if (socket.handshake.auth.uniqueIdentifier) {
      db.get(
        'SELECT * FROM Users WHERE uniqueIdentifier = ? AND authTokenExpires > ?',
        [socket.handshake.auth.uniqueIdentifier, Date.now()],
        (err, user) => {
          if (err || !user) {
            socket.emit('access-denied', { message: 'Сессия истекла.' });
            return;
          }
          jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
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
          });
        }
      );
    }
  });

  socket.emit('server-status', { status: 'online' });

  socket.on('client-info', (data) => {
    if (socket.user.isGuest) {
      return;
    }

    uniqueIdentifier = data.uniqueIdentifier;
    socket.join(`user_${uniqueIdentifier}`);

    createSinglePlayerTable(uniqueIdentifier, (result) => {
      if (!result.success) {
        logger.error(
          `Failed to create single-player table for ${uniqueIdentifier}: ${result.message}`
        );
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
        if (err) {
          logger.error(`Database error in client-info: ${err.message}`);
          return;
        }

        const updateTime =
          user && user.userPixelUpdateTime > 0
            ? user.userPixelUpdateTime * 1000
            : 5000;

        updateIntervalId = setInterval(() => {
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
        }, updateTime);
      }
    );
  });

  socket.on('check-server-status', (callback) => {
    callback({ status: 'online' });
  });

  socket.on('disconnect', () => {
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
  });

  socket.on('join-room', (room) => {
    socket.join(room);
  });

  socket.on('leave-room', (room) => {
    socket.leave(room);
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

  socket.on('route', (route) => {
    currentRoute = route;

    socket.rooms.forEach((room) => {
      if (room !== socket.id && room !== `user_${uniqueIdentifier}`) {
        socket.leave(room);
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
  });

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

  socket.on('draw-pixel', async (pixelData) => {
    if (socket.user.isGuest) {
      socket.emit('error', { message: 'Guests cannot draw pixels' });
      return;
    }

    const currentIdentifier = socket.handshake.auth.uniqueIdentifier;
    const { x, y, color, userId = currentIdentifier } = pixelData;

    try {
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
        `Error drawing pixel: ${err.message}, route=${currentRoute}, identifier=${currentIdentifier}`
      );
      socket.emit('error', {
        message: 'Error drawing pixel',
        details: err.message,
      });
    }
  });

  socket.on('get-max-pixel-count', () => {
    if (socket.user.isGuest) {
      socket.emit('max-pixel-count', { maxPixelCount: 0 });
      return;
    }
    getMaxPixelCount(uniqueIdentifier, socket);
  });

  socket.on('update-max-pixel-count', (data, callback) => {
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
  });

  socket.on('update-color-subscription', (data, callback) => {
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
      if (response.success) {
        io.to(`user_${uniqueIdentifier}`).emit('color-subscription-update', {
          isColorSubscription: isColorSubscription ? 1 : 0,
        });
      }

      if (typeof callback === 'function') {
        callback(response);
      }
    };

    updateColorSubscription(
      uniqueIdentifier,
      isColorSubscription,
      handleResponse
    );
  });

  socket.on('get-leaderboard', () => {
    getLeaderboard(socket);
  });

  socket.on('requestTotalAmount', () => {
    if (socket.user.isGuest) {
      socket.emit('placed-pixels', { count: 0 });
      socket.emit('placed-pixels-canvas1', { count: 0 });
      return;
    }
    getPlacedPixels(uniqueIdentifier, socket);
    getPlacedPixelsCanvas1(uniqueIdentifier, socket);
  });

  socket.on('get-achievements-user-data', () => {
    if (socket.user.isGuest) {
      socket.emit('achievements-user-data', { achievements: [] });
      return;
    }
    getUserAchievement(uniqueIdentifier, socket);
  });

  socket.on('get-username-data', () => {
    if (socket.user.isGuest) {
      socket.emit('username-data', { username: 'Guest' });
      return;
    }
    getUsernameData(uniqueIdentifier, socket);
  });

  socket.on('user-increment-seconds', () => {
    if (socket.user.isGuest) {
      socket.emit('username-data', { seconds: '-' });
      return;
    }
    getUserSeconds(uniqueIdentifier, socket);
  });

  socket.on('get-color-input-sub', () => {
    if (socket.user.isGuest) {
      socket.emit('get-color-input-sub', { isColorSubscription: '' });
      return;
    }
    getUserColorSubscription(uniqueIdentifier, socket);
  });

  socket.on('get-coins', () => {
    if (socket.user.isGuest) {
      socket.emit('get-coins', { coins: '' });
      return;
    }
    getUserCoins(uniqueIdentifier, socket);
  });

  socket.on('undo-last-pixel', (callback) => {
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
      if (typeof callback === 'function') {
        callback(response);
      }
    });
  });

  socket.on('claim-achievement-reward', (data, callback) => {
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
  });

  socket.on('claim-daily-reward', (data, callback) => {
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
  });

  socket.on('get-daily-rewards', () => {
    if (socket.user.isGuest) {
      socket.emit('daily-rewards-data', {});
      return;
    }
    getDailyRewards(uniqueIdentifier, socket);
  });

  socket.on('purchase-boost', (data, callback) => {
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
  });

  socket.on('get-active-boost', () => {
    if (socket.user.isGuest) {
      socket.emit('active-boost-update', { activeBoost: null });
      return;
    }
    getActiveBoost(uniqueIdentifier, socket);
  });

  socket.on('get-user-colors', () => {
    if (socket.user.isGuest) {
      socket.emit('user-colors', { colors: null });
      return;
    }
    getUserColors(uniqueIdentifier, socket);
  });

  socket.on('purchase-color', ({ color }, callback) => {
    if (socket.user.isGuest) {
      callback({ success: false, message: 'Guests cannot purchase colors' });
      return;
    }
    purchaseColor(uniqueIdentifier, color, socket, callback);
  });

  socket.on('purchase-coins', (data, callback) => {
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
    });
  });

  socket.on('get-messages', () => {
    socket.emit('chat-messages', { messages: chatMessages });
  });

  socket.on('send-message', (data, callback) => {
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
      }
    );
  });

  socket.on('connect', () => {
    socket.join(`user_${uniqueIdentifier}`);
    io.emit('user-count', {
      totalUsers: Object.keys(onlineUsers).length || 0,
      totalConnections:
        Object.values(onlineUsers).reduce(
          (total, connections) => total + (connections?.length || 0),
          0
        ) || 0,
    });
  });

  socket.on('get-user-access-canplace', () => {
    if (socket.user.isGuest) {
      socket.emit('user-canplace', { canPlacePixel: null });
      socket.emit('user-access', { access: null });
      return;
    }
    getUserAccess(uniqueIdentifier, socket);
    getCanPlacePixels(uniqueIdentifier, socket);
  });

  // eslint-disable-next-line no-unused-vars
  socket.on('error', (error) => {
    socket.emit('server-error', { message: 'Server error occurred' });
  });
}

module.exports = { handleSocketEvents };

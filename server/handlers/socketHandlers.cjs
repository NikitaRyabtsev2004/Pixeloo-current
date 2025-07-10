const { logger } = require('../utils/libs/logger.cjs');
const { handlePixelDraw } = require('../utils/pixel/handlePixelDraw.cjs');
const { sendUserPixelCount } = require('../utils/pixel/sendUserPixelCount.cjs');
const jwt = require('jsonwebtoken');

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
  createSinglePlayerTable,
} = require('../database/dbQueries.cjs');

const {
  checkAndEmitPixelStatus,
} = require('../utils/pixel/checkAndEmitPixelStatus.cjs');

const db = require('../database/dbSetup.cjs');

//! const {
//!   incrementPixelCount,
//! } = require('../utils/pixel/incrementPixelCount.cjs');

function handleSocketEvents(socket, io, onlineUsers) {
  let uniqueIdentifier = socket.handshake.auth.uniqueIdentifier || 'guest';
  let currentRoute;
  let updateIntervalId = null;

  if (!socket.user) {
    socket.user = { isGuest: true };
    // ? logger.warn('socket.user was undefined, set to guest');
  }

  if (socket.handshake.auth.token && socket.handshake.auth.uniqueIdentifier) {
    db.get(
      'SELECT * FROM Users WHERE uniqueIdentifier = ? AND authToken = ? AND authTokenExpires > ?',
      [socket.handshake.auth.uniqueIdentifier, socket.handshake.auth.token, Date.now()],
      (err, user) => {
        if (err || !user) {
          socket.user = { isGuest: true };
          socket.emit('access-denied', { message: 'Недействительный токен или сессия истекла.' });
          return;
        }

        jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET, (err) => {
          if (err) {
            socket.user = { isGuest: true };
            socket.emit('access-denied', { message: 'Токен истек.' });
            return;
          }
          socket.user.isGuest = false;
        });
      }
    );
  }

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
            if (err || decoded.uniqueIdentifier !== socket.handshake.auth.uniqueIdentifier) {
              socket.emit('access-denied', { message: 'Недействительный токен.' });
              return;
            }
            socket.handshake.auth.token = token;
            socket.user.isGuest = false;
            //? logger.info(`Token updated for user ${socket.handshake.auth.uniqueIdentifier}`);
          });
        }
      );
    }
  });

  socket.emit('server-status', { status: 'online' });

  socket.on('client-info', (data) => {
    if (socket.user.isGuest) {
      // ? logger.info('Guest user connected, skipping client-info processing');
      return;
    }

    uniqueIdentifier = data.uniqueIdentifier;

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
            io.emit('user-count', {
              totalUsers: Object.keys(onlineUsers).length || 0,
              totalConnections: Object.values(onlineUsers).reduce(
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
    // Отправляем user-count при отключении
    io.emit('user-count', {
      totalUsers: Object.keys(onlineUsers).length || 0,
      totalConnections: Object.values(onlineUsers).reduce(
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
      if (room !== socket.id) socket.leave(room);
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
      logger.error(`Error drawing pixel: ${err.message}, route=${currentRoute}, identifier=${currentIdentifier}`);
      socket.emit('error', { message: 'Error drawing pixel', details: err.message });
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

  socket.on('connect', () => {
    io.emit('user-count', {
      totalUsers: Object.keys(onlineUsers).length || 0,
      totalConnections: Object.values(onlineUsers).reduce(
        (total, connections) => total + (connections?.length || 0),
        0
      ) || 0,
    });
  });

  // eslint-disable-next-line no-unused-vars
  socket.on('error', (error) => {
    socket.emit('server-error', { message: 'Server error occurred' });
  });
}

module.exports = { handleSocketEvents };
/* eslint-disable no-redeclare */
/* eslint-disable no-console */
require('moment/locale/ru');
require('dotenv').config();
const { Server } = require('socket.io');
const http = require('http');
const moment = require('moment');
const app = require('./routes/routes.cjs');
const { logger } = require('./utils/libs/logger.cjs');

const {
  connectRedis,
} = require('./utils/functions/events/redisConnections.cjs');
const {
  authenticateSocket,
} = require('./utils/functions/events/socketAuth.cjs');
const {
  handleServerSigintEvent,
  handleServerEvents,
} = require('./utils/functions/events/handleServerEvents.cjs');
const { handleSocketEvents } = require('./handlers/socketHandlers.cjs');
const {
  initiateInterval,
} = require('./utils/functions/events/setInterval.cjs');
const {
  getTotalConnections,
} = require('./utils/functions/events/getTotalConnections.cjs');
const { startImageGeneration } = require('./images/canvasImageGenerator.cjs');
const {
  PixelReplenishmentService,
} = require('./utils/pixel/pixelReplenishmentService.cjs');
moment.locale('ru');

(async () => {
  await connectRedis();
  let server = http.createServer(app);
  let io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  io.use(authenticateSocket);

  let onlineUsers = {};

  const initiateServer = (port) => {
    let server = http.createServer(app);
    let io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });
    io.use(authenticateSocket); // Применяем middleware для новых подключений
    let pixelReplenishmentService = new PixelReplenishmentService(io);
    pixelReplenishmentService.start();

    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });

    startImageGeneration(io);

    io.on('connection', (socket) => {
      const uniqueIdentifier =
        socket.handshake.auth.uniqueIdentifier || 'guest';
      const origin = socket.handshake.headers.origin;

      //* logger.info(
      //*   `New connection attempt from origin: ${origin}, user: ${uniqueIdentifier}`
      //* );

      if (origin !== process.env.CLIENT_URL) {
        logger.error(`Unauthorized connection attempt from origin: ${origin}`);
        socket.disconnect();
        return;
      }

      if (!socket.user) {
        logger.warn(
          'socket.user was undefined after authentication, setting to guest'
        );
        socket.user = { isGuest: true };
      }

      if (!socket.user.isGuest) {
        if (!onlineUsers[uniqueIdentifier]) {
          onlineUsers[uniqueIdentifier] = [];
        }
        onlineUsers[uniqueIdentifier].push(socket.id);
      }

      logger.info(
        `User Connection - User connected with ID: ${uniqueIdentifier} from IP: ${socket.handshake.address} - Total users: ${Object.keys(onlineUsers).length}, Total connections: ${getTotalConnections(onlineUsers)} - ${moment().format('LL LTS')}`
      );

      io.emit('user-count', {
        totalUsers: Object.keys(onlineUsers).length,
        totalConnections: getTotalConnections(onlineUsers),
      });

      socket.on('disconnect', () => {
        if (!socket.user.isGuest && onlineUsers[uniqueIdentifier]) {
          onlineUsers[uniqueIdentifier] = onlineUsers[uniqueIdentifier].filter(
            (id) => id !== socket.id
          );

          if (onlineUsers[uniqueIdentifier].length === 0) {
            delete onlineUsers[uniqueIdentifier];
          }

          logger.info(
            `User Disconnection - User with ID: ${uniqueIdentifier} disconnected - Total users: ${Object.keys(onlineUsers).length}, Total connections: ${getTotalConnections(onlineUsers)} - ${moment().format('LL LTS')}`
          );

          io.emit('user-count', {
            totalUsers: Object.keys(onlineUsers).length || 0,
            totalConnections: getTotalConnections(onlineUsers) || 0,
          });
        }
      });

      let isServerOnline = true;
      socket.emit('server-status', { status: 'online' });

      function updateServerStatus(isOnline) {
        isServerOnline = isOnline;
        io.sockets.emit('server-status-update', {
          status: isOnline ? 'online' : 'offline',
        });
      }

      setInterval(() => {
        if (!isServerOnline) {
          updateServerStatus(true);
        }
      }, 2000);

      handleServerSigintEvent(io);

      handleSocketEvents(socket, io, onlineUsers);
    });
  };

  let isServerOnline = true;

  initiateInterval(onlineUsers, isServerOnline, io, () =>
    getTotalConnections(onlineUsers)
  );

  initiateServer(process.env.PORT);
})();

handleServerEvents();

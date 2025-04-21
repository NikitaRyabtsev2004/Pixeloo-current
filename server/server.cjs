/* eslint-disable no-redeclare */
/* eslint-disable no-console */
require('moment/locale/ru');
require('dotenv').config();
const { Server } = require('socket.io');
const http = require('http');
const moment = require('moment');
const app = require('./routes/routes.cjs');
const { logger } = require('./utils/libs/logger.cjs');
// const { sslOptions } = require('./utils/libs/sslOptions.cjs');

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
const { initiateInterval } = require('./utils/functions/events/setInterval.cjs');
const { getTotalConnections } = require('./utils/functions/events/getTotalConnections.cjs');
// const https = require('https');
moment.locale('ru'); 
// const WebSocket = require('ws');
// const wss = new WebSocket.Server({ port: 15001 });

(async () => {
  await connectRedis();
  let server = http.createServer(app);
  let io = new Server(server, {
    cors: {
      origin: 'http://localhost:4000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  io.use(authenticateSocket);
  const battleManager = require('./managers/battleManager.cjs')(io);

  let onlineUsers = {};

  for (let i = 1; i <= 5; i++) {
    battleManager.createGame(`b${i}`);
  }
  logger.info('Игры инициализированы:', JSON.stringify(battleManager.games, null, 2));

  const initiateServer = (port) => {
    let server = http.createServer(app);
    let io = new Server(server, {
      cors: {
        origin: 'http://localhost:4000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });


    io.on('connection', (socket) => {
      const uniqueIdentifier = socket.handshake.auth.uniqueIdentifier;
      const origin = socket.handshake.headers.origin;

      // if (!uniqueIdentifier) {
      //   logger.warn(`Unauthorized connection attempt from IP: ${socket.handshake.address}`);
      //   socket.disconnect();
      //   return;
      // }

      if (origin !== process.env.CLIENT_URL) {
       logger.error(`Unauthorized connection attempt from origin: ${origin}`);
       socket.disconnect();
       return;
      }
      
      if (!onlineUsers[uniqueIdentifier]) {
        onlineUsers[uniqueIdentifier] = [];
      }
      onlineUsers[uniqueIdentifier].push(socket.id);
      console.log(onlineUsers)
      logger.info(
        `User Connection - User connected with ID: ${uniqueIdentifier} from IP: ${socket.handshake.address} - Total users: ${Object.keys(onlineUsers).length}, Total connections: ${getTotalConnections(onlineUsers)} - ${moment().format('LL LTS')}`
      );

      io.emit('user-count', {
        totalUsers: Object.keys(onlineUsers).length,
        totalConnections: getTotalConnections(onlineUsers),
      });

      socket.join('battle-lobby');

      socket.on('disconnect', () => {
        if (onlineUsers[uniqueIdentifier]) {
          onlineUsers[uniqueIdentifier] = onlineUsers[uniqueIdentifier].filter(
            (id) => id !== socket.id
          );

          if (onlineUsers[uniqueIdentifier].length === 0) {
            delete onlineUsers[uniqueIdentifier];
          }

          logger.info(
            `User Disconnection - User with ID: ${uniqueIdentifier} disconnected - Total users: ${Object.keys(onlineUsers).length}, Total connections: ${getTotalConnections()} - ${moment().format('LL LTS')}`
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

      handleSocketEvents(socket, io, onlineUsers, battleManager);
    });
  };

  let isServerOnline = true;

  initiateInterval(onlineUsers, isServerOnline, io, () => getTotalConnections(onlineUsers));

  initiateServer(process.env.PORT);
})();

handleServerEvents();

/* eslint-disable no-console */
const http = require('http');
const { Server } = require('socket.io');
const { app } = require('./routes/routes.cjs');
const { sslOptions } = require('./utils/libs/sslOptions.cjs');
const { authenticateSocket } = require('./utils/functions/events/socketAuth.cjs');
const { connectRedis } = require('./utils/functions/events/redisConnections.cjs');
const { ioConnection } = require('./utils/functions/events/ioConnection.cjs');
const { handleSocketEvents } = require('./handlers/socketHandlers.cjs');

let onlineUsers = 0;

// const origin = socket.handshake.headers.origin;

      // if (!uniqueIdentifier) {
      //   logger.warn(`Unauthorized connection attempt from IP: ${socket.handshake.address}`);
      //   socket.disconnect();
      //   return;
      // }

      // if (origin !== process.env.CLIENT_URL) {
      //  logger.error(`Unauthorized connection attempt from origin: ${origin}`);
      //  socket.disconnect();
      //  return;
      // }

async function initiateServer(port) {
  await connectRedis();

  let server = http.createServer(sslOptions, app);
  let io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST'],
    },
  });

  io.use(authenticateSocket);

  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST'],
    },
  });

  ioConnection(io, onlineUsers)
  io.on('connection', (socket) => handleSocketEvents(socket, io, onlineUsers));

  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

module.exports = { initiateServer };

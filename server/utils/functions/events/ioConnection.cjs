const { handleSocketEvents } = require('../../../handlers/socketHandlers.cjs');
const logger = require('../../libs/logger.cjs');
const { handleServerSigintEvent } = require('./handleServerEvents.cjs');
const moment = require('moment');
const { initiateInterval } = require('./setInterval.cjs');
require('moment/locale/ru');
moment.locale('ru');

async function ioConnection(io, onlineUsers) {
  io.on('connection', (socket) => {
    let isServerOnline = true;
    const origin = socket.handshake.headers.origin;

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
    }, 20000);

    handleServerSigintEvent(io);

    if (origin !== process.env.CLIENT_URL) {
      logger.error('Unauthorized connection attempt:', origin);
      socket.disconnect();
      return;
    }
    //! logger.info(
    //!  `User Connection - User connected from IP: ${
    //!     socket.handshake.address
    //!   } - Total online users: ${onlineUsers} - ${moment().format('LL LTS')}`
    //! );
    onlineUsers++;
    io.emit('user-count', onlineUsers);
    handleSocketEvents(socket, io, onlineUsers);
    initiateInterval(io, onlineUsers, isServerOnline);
  });
}

module.exports = { ioConnection };

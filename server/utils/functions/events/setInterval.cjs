const { logger } = require('../../libs/logger.cjs');
const moment = require('moment');
require('moment/locale/ru');
moment.locale('ru');

async function initiateInterval(
  onlineUsers,
  isServerOnline,
  io,
  getTotalConnections
) {
  setInterval(() => {
    const serverStatus = {
      onlineUsers: onlineUsers,
      serverStatus: isServerOnline ? 'online' : 'offline',
      currentDateTime: moment().format('LL LTS'),
    };

    io.emit('server-status-update', serverStatus);

    logger.info(
      `Server Status - The server file is operational - ${moment().format(
        'LL LTS'
      )}`
    );
    logger.info(
      `Online Users - Total online users: ${Object.keys(onlineUsers).length} & sessions online: ${getTotalConnections()} - ${moment().format('LL LTS')}`
    );
  }, 10000);
}

module.exports = { initiateInterval };

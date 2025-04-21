// utils/serverStatus.js
let isServerOnline = true;

function updateServerStatus(io, status) {
  isServerOnline = status;
  io.sockets.emit('server-status-update', {
    status: isServerOnline ? 'online' : 'offline',
  });
}

function logServerStatus(io) {
  setInterval(() => {
    updateServerStatus(io, isServerOnline);
  }, 2000);
}

module.exports = { updateServerStatus, logServerStatus };

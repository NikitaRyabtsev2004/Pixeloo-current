const { PixelReplenishmentService } = require("../../pixel/pixelReplenishmentService.cjs");

/* eslint-disable no-console */
function handleServerEvents() {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    if (error && error.message) {
      console.error('Uncaught Exception:', error.message);
    } else {
      console.error('Uncaught Exception:', error || 'Unknown error');
    }
    process.exit(1);
  });
}

const handleServerSigintEvent = (io) => {
  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    io.emit('server-status-update', { status: 'offline' });
    PixelReplenishmentService.stop();
    setTimeout(() => {
      process.exit(0);
    }, 3000);
  });
};

module.exports = { 
  handleServerEvents,
  handleServerSigintEvent 
};

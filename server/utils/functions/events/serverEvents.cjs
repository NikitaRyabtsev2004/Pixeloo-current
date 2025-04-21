/* eslint-disable no-console */
function handleServerEvents() {
    process.on('SIGINT', () => {
      console.log('Shutting down server...');
      setTimeout(() => process.exit(0), 3000);
    });
  
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection:', promise, 'reason:', reason);
      process.exit(1);
    });
  
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error.message);
      process.exit(1);
    });
  }
  
  module.exports = { handleServerEvents };
  
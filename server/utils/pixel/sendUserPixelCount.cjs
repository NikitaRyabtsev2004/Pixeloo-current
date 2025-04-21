const db = require('../../database/dbSetup.cjs');
const { logger } = require('../libs/logger.cjs');

function sendUserPixelCount(socket, uniqueIdentifier) {
  db.get(
    'SELECT pixelCount, maxPixelCount FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, row) => {
      if (err) {
        logger.error('Database error:', err.message);
        return;
      }
      if (row) {
        socket.emit('user-pixel-count', {
          pixelCount: row.pixelCount,
          maxPixelCount: row.maxPixelCount,
        });
      }
    }
  );
}

module.exports = { sendUserPixelCount };

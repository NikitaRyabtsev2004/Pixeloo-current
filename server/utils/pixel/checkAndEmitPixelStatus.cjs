const db = require('../../database/dbSetup.cjs');
const { logger } = require('../libs/logger.cjs');
const moment = require('moment');

/**
 * Проверяет и отправляет статус пикселей пользователю.
 *
 * @param {Object} socket - Socket.IO соединение.
 * @param {string} uniqueIdentifier - Уникальный идентификатор пользователя.
 */
function checkAndEmitPixelStatus(socket, uniqueIdentifier) {
  db.get(
    'SELECT pixelCount FROM Users WHERE uniqueIdentifier = ?',
    [uniqueIdentifier],
    (err, row) => {
      if (err) {
        const logMessage = `Pixel Status - Database error while checking pixelCount for user (${uniqueIdentifier}): ${err.message} - ${moment().format('LL LTS')}`;
        logger.error(logMessage);
        return;
      }

      const pixelCount = row ? row.pixelCount : 0;
      const hasNoMorePixels = pixelCount === 0;

      socket.emit('no-more-pixels', hasNoMorePixels);

      //? const logMessage = `Pixel Status - User (${uniqueIdentifier}) has ${pixelCount} pixels remaining - ${moment().format('LL LTS')}`;
      //? logger.info(logMessage);
    }
  );
}

module.exports = { checkAndEmitPixelStatus };

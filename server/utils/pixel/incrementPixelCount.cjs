const db = require('../../database/dbSetup.cjs');
const { logger } = require('../libs/logger.cjs');

/**
 * Увеличивает количество пикселей для пользователей с неполным лимитом пикселей.
 * @param {Object} io - Экземпляр Socket.IO для отправки обновлений пользователям.
 */

function incrementPixelCount(io) {
  db.all(
    'SELECT id, uniqueIdentifier, pixelCount, maxPixelCount FROM Users WHERE pixelCount < maxPixelCount',
    (err, users) => {
      if (err) {
        logger.error(`Error fetching users: ${err.message}`);
        return;
      }

      users.forEach((user) => {
        const newPixelCount = user.pixelCount + 1;

        db.run(
          'UPDATE Users SET pixelCount = ? WHERE id = ?',
          [newPixelCount, user.id],
          (updateErr) => {
            if (updateErr) {
              logger.error(
                `Pixel Increment Error - User: ${user.id} - ${updateErr.message}`
              );
              return;
            }

            io.emit('user-pixel-count-update', {
              userId: user.id,
              newPixelCount: newPixelCount,
            });
            logger.info(
              `Pixel Increment - User: ${user.id} now has ${newPixelCount} pixels`
            );
          }
        );
      });
    }
  );
}

module.exports = { incrementPixelCount };

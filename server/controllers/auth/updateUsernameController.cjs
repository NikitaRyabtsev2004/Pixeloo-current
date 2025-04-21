const db = require('../../database/dbSetup.cjs');
const { logger } = require('../../utils/libs/logger.cjs');

const updateUsername = async (req, res) => {
  const { email, confirmationCode, newUsername } = req.body;

  const logMessageStart = `Username Update Attempt - Email: ${email} - ${new Date().toISOString()}`;
  logger.info(logMessageStart);

  db.get(
    'SELECT * FROM Users WHERE email = ? AND confirmationCode = ?',
    [email, confirmationCode],
    (err, user) => {
      if (err || !user) {
        logger.error(
          `Username Update Error - Invalid code for Email: ${email}`
        );
        return res.status(400).json({ message: 'Неверный код подтверждения.' });
      }

      db.run(
        'UPDATE Users SET username = ? WHERE email = ?',
        [newUsername, email],
        (err) => {
          if (err) {
            logger.error(
              `Username Update Error - Database error: ${err.message}`
            );
            return res.status(400).json({ message: 'Никнейм уже занят.' });
          }
          logger.info(`Username Updated - New: ${newUsername}`);
          res.status(200).json({ message: 'Никнейм успешно изменен.' });
        }
      );
    }
  );
};

module.exports = { updateUsername };

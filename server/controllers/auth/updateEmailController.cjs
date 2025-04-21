const db = require('../../database/dbSetup.cjs');
const { logger } = require('../../utils/libs/logger.cjs');

const updateEmail = async (req, res) => {
  const { oldEmail, newEmail, confirmationCode } = req.body;

  const logMessageStart = `Email Update Attempt - Old: ${oldEmail} - New: ${newEmail}`;
  logger.info(logMessageStart);

  db.get(
    'SELECT * FROM Users WHERE email = ? AND confirmationCode = ?',
    [oldEmail, confirmationCode],
    (err, user) => {
      if (err || !user) {
        logger.error(
          `Email Update Error - Invalid code for Email: ${oldEmail}`
        );
        return res.status(400).json({ message: 'Неверный код подтверждения.' });
      }

      db.run(
        'UPDATE Users SET email = ? WHERE email = ?',
        [newEmail, oldEmail],
        (err) => {
          if (err) {
            logger.error(`Email Update Error - Database error: ${err.message}`);
            return res.status(400).json({ message: 'Почта уже занята.' });
          }
          logger.info(`Email Updated - New: ${newEmail}`);
          res.status(200).json({ message: 'Почта успешно изменена.' });
        }
      );
    }
  );
};

module.exports = { updateEmail };

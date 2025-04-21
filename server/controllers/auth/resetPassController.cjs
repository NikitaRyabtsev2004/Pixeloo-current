const db = require('../../database/dbSetup.cjs');
const { logger } = require('../../utils/libs/logger.cjs');
const bcrypt = require('bcrypt');

const resetPassword = async (req, res) => {
  const { email, confirmationCode, newPassword } = req.body;

  const logMessageStart = `Password Reset Attempt - Email: ${email} - ${new Date().toISOString()}`;
  logger.info(logMessageStart);

  db.get(
    'SELECT * FROM Users WHERE email = ? AND confirmationCode = ?',
    [email, confirmationCode],
    async (err, user) => {
      if (err || !user) {
        const logMessage = `Password Reset Error - Invalid code for Email: ${email} - ${new Date().toISOString()}`;
        logger.error(logMessage);
        return res.status(400).json({ message: 'Неверный код подтверждения.' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.run(
        'UPDATE Users SET password = ? WHERE email = ?',
        [hashedPassword, email],
        (err) => {
          if (err) {
            const logMessage = `Password Reset Error - Database update failed for Email: ${email} - ${new Date().toISOString()}`;
            logger.error(logMessage);
            return res
              .status(500)
              .json({ message: 'Ошибка изменения пароля.' });
          }
          const logMessage = `Password Reset Successful - Email: ${email} - ${new Date().toISOString()}`;
          logger.info(logMessage);
          res.status(200).json({ message: 'Пароль успешно изменен.' });
        }
      );
    }
  );
};

module.exports = { resetPassword };

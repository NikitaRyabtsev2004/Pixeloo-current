const db = require('../../database/dbSetup.cjs');
const { logger } = require('../../utils/libs/logger.cjs');

const updateEmail = async (req, res) => {
  const { oldEmail, newEmail, confirmationCode, newEmailConfirmationCode, phase } = req.body;

  const logMessageStart = `Email Update Attempt - Phase: ${phase}, Old: ${oldEmail}, New: ${newEmail}`;
  logger.info(logMessageStart);

  if (phase === 1) {
    // Phase 1: Verify old email's confirmation code and store new email
    db.get(
      'SELECT * FROM Users WHERE email = ? AND confirmationCode = ?',
      [oldEmail, confirmationCode],
      (err, user) => {
        if (err || !user) {
          logger.error(`Email Update Error - Invalid confirmation code for Old Email: ${oldEmail}`);
          return res.status(400).json({ message: 'Неверный код подтверждения для текущей почты.' });
        }

        // Store the new email and its confirmation code
        db.run(
          'UPDATE Users SET pendingEmail = ?, pendingEmailConfirmationCode = ? WHERE email = ?',
          [newEmail, newEmailConfirmationCode, oldEmail],
          (err) => {
            if (err) {
              logger.error(`Email Update Error - Failed to store pending email: ${err.message}`);
              return res.status(400).json({ message: 'Ошибка сохранения новой почты.' });
            }
            logger.info(`Pending Email Stored - New: ${newEmail} for Old Email: ${oldEmail}`);
            res.status(200).json({ message: 'Код отправлен на новую почту.' });
          }
        );
      }
    );
  } else if (phase === 2) {
    // Phase 2: Verify new email's confirmation code and update email
    db.get(
      'SELECT * FROM Users WHERE email = ? AND pendingEmail = ? AND pendingEmailConfirmationCode = ?',
      [oldEmail, newEmail, newEmailConfirmationCode],
      (err, user) => {
        if (err || !user) {
          logger.error(
            `Email Update Error - Invalid new email confirmation code for New Email: ${newEmail}`
          );
          return res.status(400).json({ message: 'Неверный код подтверждения для новой почты.' });
        }

        // Update the email and clear pending fields
        db.run(
          'UPDATE Users SET email = ?, confirmationCode = NULL, pendingEmail = NULL, pendingEmailConfirmationCode = NULL WHERE email = ?',
          [newEmail, oldEmail],
          (err) => {
            if (err) {
              logger.error(`Email Update Error - Database error: ${err.message}`);
              return res.status(400).json({ message: 'Почта уже занята или ошибка базы данных.' });
            }
            logger.info(`Email Updated - New: ${newEmail}`);
            res.status(200).json({ message: 'Почта успешно изменена.' });
          }
        );
      }
    );
  } else {
    logger.error(`Email Update Error - Invalid phase: ${phase}`);
    return res.status(400).json({ message: 'Недопустимая фаза операции.' });
  }
};

module.exports = { updateEmail };
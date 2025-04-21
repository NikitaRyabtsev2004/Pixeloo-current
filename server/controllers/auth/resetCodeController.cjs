const db = require('../../database/dbSetup.cjs');
const { generateRandomCode } = require('../../utils/functions/generators.cjs');
const { logger } = require('../../utils/libs/logger.cjs');
const { transporter } = require('../../utils/libs/transporter.cjs');

const resetCode = (req, res) => {
  const { email } = req.body;

  if (!email) {
    logger.error(`Reset Code Error - Email is required.`);
    return res.status(400).json({ message: 'Email обязателен.' });
  }

  logger.info(`Reset Code Attempt - Email: ${email}`);

  const confirmationCode = generateRandomCode();

  db.get('SELECT * FROM Users WHERE email = ?', [email], (err, user) => {
    if (err || !user) {
      logger.error(
        `Reset Code Error - User not found or DB error for Email: ${email}`
      );
      return res.status(400).json({ message: 'Пользователь не найден.' });
    }

    db.run(
      'UPDATE Users SET confirmationCode = ? WHERE email = ?',
      [confirmationCode, email],
      (err) => {
        if (err) {
          logger.error(
            `Reset Code Error - Failed to update confirmation code for Email: ${email} - ${err.message}`
          );
          return res.status(500).json({ message: 'Ошибка обновления кода.' });
        }

        logger.info(
          `Reset Code Updated in DB - Email: ${email}, Code: ${confirmationCode}`
        );

        const mailOptions = {
          from: '"Pixel Art" <SoftSeason@yandex.ru>',
          to: email,
          subject: 'Сброс пароля',
          text: `Ваш код для сброса пароля: ${confirmationCode}`,
        };

        transporter.sendMail(mailOptions, (error) => {
          if (error) {
            logger.error(
              `Reset Code Error - Failed to send email to Email: ${email} - ${error.message}`
            );
            return res.status(500).json({ message: 'Ошибка отправки письма.' });
          }

          logger.info(`Reset Code Email Sent - Email: ${email}`);
          res.status(200).json({ message: 'Код сброса отправлен на почту.' });
        });
      }
    );
  });
};

module.exports = { resetCode };

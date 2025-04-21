const {
  generateRandomCode,
  generateUniqueIdentifier,
} = require('../../utils/functions/generators.cjs');
const { logger } = require('../../utils/libs/logger.cjs');
const { transporter } = require('../../utils/libs/transporter.cjs');
const { validatePassword } = require('../../utils/functions/validators.cjs');
const bcrypt = require('bcrypt');

const pendingRegistrations = {};

const registerUser = async (req, res) => {
  const { email, username, password, confirmPassword } = req.body;

  const logMessageStart = `Registration Attempt - Email: ${email}, Username: ${username} - ${new Date().toISOString()}`;
  logger.info(logMessageStart);

  try {
    if (password !== confirmPassword) {
      const logMessage = `Registration Error - Password mismatch for Email: ${email} - ${new Date().toISOString()}`;
      logger.error(logMessage);
      return res.status(400).json({ message: 'Пароли не совпадают.' });
    }

    if (!validatePassword(password)) {
      const logMessage = `Registration Error - Weak password for Email: ${email} - ${new Date().toISOString()}`;
      logger.error(logMessage);
      return res.status(400).json({
        message:
          'Пароль должен содержать минимум 8 символов,\n' +
          'включая:\n' +
          '- Заглавные и строчные буквы\n' +
          '- Цифры\n' +
          '- Специальные символы: @, $, !, %, *, ?, &\n',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const confirmationCode = generateRandomCode();
    const uniqueIdentifier = generateUniqueIdentifier();

    pendingRegistrations[email] = {
      username,
      hashedPassword,
      confirmationCode,
      uniqueIdentifier,
    };

    const mailOptions = {
      from: '"Pixel Art" <SoftSeason@yandex.ru>',
      to: email,
      subject: 'Подтверждение регистрации',
      text: `Ваш код подтверждения: ${confirmationCode}`,
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        const logMessage = `Registration Error - Email sending failed for Email: ${email} - ${new Date().toISOString()}`;
        logger.error(logMessage);
        return res.status(500).json({ message: 'Ошибка отправки письма.' });
      }

      const logMessage = `Registration Email Sent - Email: ${email} - ${new Date().toISOString()}`;
      logger.info(logMessage);
      res.status(200).json({
        message: 'Проверьте вашу почту для подтверждения.',
        needVerification: true,
        uniqueIdentifier,
      });
    });
  } catch (error) {
    const logMessage = `Registration Error - Email: ${email} - Error: ${error.message} - ${new Date().toISOString()}`;
    logger.error(logMessage);
    res.status(500).json({ message: 'Ошибка регистрации.' });
  }
};

module.exports = { pendingRegistrations, registerUser };

const db = require('../../database/dbSetup.cjs');
const { generateRandomCode } = require('../../utils/functions/generators.cjs');
const { logger } = require('../../utils/libs/logger.cjs');
const { transporter } = require('../../utils/libs/transporter.cjs');
const { generateEmailTemplate } = require('../../utils/styles/emailTemplate.cjs');

const resetCode = (req, res) => {
  const { email, operation } = req.body;

  if (!email) {
    logger.error('Reset Code Error - Email is required.');
    return res.status(400).json({ message: 'Email обязателен.' });
  }

  if (!['password-reset', 'username-change', 'email-change', 'email-change-new'].includes(operation)) {
    logger.error(`Reset Code Error - Invalid operation: ${operation}`);
    return res.status(400).json({ message: 'Недопустимая операция.' });
  }

  logger.info(`Reset Code Attempt - Email: ${email}, Operation: ${operation}`);

  const confirmationCode = generateRandomCode();

  // Определяем заголовок и описание для каждой операции
  let title, description;
  switch (operation) {
    case 'password-reset':
      title = 'Сброс пароля';
      description = 'Ваш код для сброса пароля';
      break;
    case 'username-change':
      title = 'Смена никнейма';
      description = 'Ваш код для смены никнейма';
      break;
    case 'email-change':
      title = 'Подтверждение текущей почты';
      description = 'Ваш код для подтверждения текущей почты';
      break;
    case 'email-change-new':
      title = 'Подтверждение новой почты';
      description = 'Ваш код для подтверждения новой почты';
      break;
    default:
      logger.error(`Reset Code Error - Unknown operation: ${operation}`);
      return res.status(400).json({ message: 'Недопустимая операция.' });
  }

  const { text, html } = generateEmailTemplate({ title, description, confirmationCode });

  // Для email-change-new не проверяем наличие email в базе
  if (operation !== 'email-change-new') {
    db.get('SELECT * FROM Users WHERE email = ?', [email], (err, user) => {
      if (err || !user) {
        logger.error(`Reset Code Error - User not found or DB error for Email: ${email}`);
        return res.status(400).json({ message: 'Пользователь не найден.' });
      }

      db.run(
        'UPDATE Users SET confirmationCode = ? WHERE email = ?',
        [confirmationCode, email],
        (err) => {
          if (err) {
            logger.error(`Reset Code Error - Failed to update confirmation code for Email: ${email} - ${err.message}`);
            return res.status(500).json({ message: 'Ошибка обновления кода.' });
          }

          sendEmail(email, operation, text, html, res);
        }
      );
    });
  } else {
    sendEmail(email, operation, text, html, res, true);
  }
};

const sendEmail = (email, operation, text, html, res, returnCode = false) => {
  const mailOptions = {
    from: '"Pixeloo" <pixeloo@pixeloo.ru>',
    to: email,
    subject: operation === 'password-reset' ? 'Сброс пароля' :
             operation === 'username-change' ? 'Смена никнейма' :
             operation === 'email-change' ? 'Подтверждение смены почты' :
             'Подтверждение новой почты',
    text,
    html,
  };

  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      logger.error(`Reset Code Error - Failed to send email to Email: ${email} - ${error.message}`);
      return res.status(500).json({ message: 'Ошибка отправки письма.' });
    }

    logger.info(`Reset Code Email Sent - Email: ${email}, Operation: ${operation}`);
    const response = { message: 'Код отправлен на почту.' };
    if (returnCode) {
      response.confirmationCode = mailOptions.text.match(/\d{6}/)[0]; // Извлекаем код из текста
    }
    res.status(200).json(response);
  });
};

module.exports = { resetCode };
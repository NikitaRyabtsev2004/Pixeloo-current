const db = require('../../database/dbSetup.cjs');
const { logger } = require('../../utils/libs/logger.cjs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const loginUser = (req, res) => {
  const { usernameOrEmail, password } = req.body;

  const logMessageStart = `Login Attempt - Username/Email: ${usernameOrEmail} - ${new Date().toISOString()}`;
  logger.info(logMessageStart);

  db.get(
    'SELECT * FROM Users WHERE (username = ? OR email = ?) AND isVerified = 1',
    [usernameOrEmail, usernameOrEmail],
    (err, user) => {
      if (err || !user) {
        const logMessage = `Login Error - User not found or DB error for Username/Email: ${usernameOrEmail} - ${new Date().toISOString()}`;
        logger.error(logMessage);
        return res.status(400).json({ message: 'Неверный логин или пароль.' });
      }

      bcrypt.compare(password, user.password, (err, result) => {
        if (err || !result) {
          const logMessage = `Login Error - Incorrect password for Username/Email: ${usernameOrEmail} - ${new Date().toISOString()}`;
          logger.error(logMessage);
          return res
            .status(400)
            .json({ message: 'Неверный логин или пароль.' });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
          expiresIn: '1h',
        });
        const logMessage = `Login Successful - Username/Email: ${usernameOrEmail} - ${new Date().toISOString()}`;
        logger.info(logMessage);
        res.status(200).json({
          message: 'Успешный вход.',
          token,
          uniqueIdentifier: user.uniqueIdentifier,
        });
      });
    }
  );
};

module.exports = { loginUser };

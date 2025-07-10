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

        const token = jwt.sign(
          { userId: user.id, uniqueIdentifier: user.uniqueIdentifier },
          process.env.JWT_SECRET,
          { expiresIn: '24h' } 
        );

        db.run(
          'UPDATE Users SET authToken = ?, authTokenExpires = ? WHERE id = ?',
          [token, Date.now() + 24 * 60 * 60 * 1000, user.id],
          (err) => {
            if (err) {
              logger.error(`Failed to update authToken: ${err.message}`);
              return res.status(500).json({ message: 'Ошибка сервера.' });
            }

            const logMessage = `Login Successful - Username/Email: ${usernameOrEmail} - ${new Date().toISOString()}`;
            logger.info(logMessage);
            res.status(200).json({
              message: 'Успешный вход.',
              token,
              uniqueIdentifier: user.uniqueIdentifier,
            });
          }
        );
      });
    }
  );
};

const refreshToken = (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(401).json({ message: 'Токен не предоставлен.' });
  }

  db.get(
    'SELECT * FROM Users WHERE authToken = ? AND authTokenExpires > ?',
    [token, Date.now()],
    (err, user) => {
      if (err || !user) {
        return res.status(401).json({ message: 'Недействительный токен или сессия истекла.' });
      }

      const newToken = jwt.sign(
        { userId: user.id, uniqueIdentifier: user.uniqueIdentifier },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      db.run(
        'UPDATE Users SET authToken = ?, authTokenExpires = ? WHERE id = ?',
        [newToken, Date.now() + 24 * 60 * 60 * 1000, user.id],
        (err) => {
          if (err) {
            logger.error(`Failed to update authToken: ${err.message}`);
            return res.status(500).json({ message: 'Ошибка сервера.' });
          }

          res.status(200).json({
            message: 'Токен обновлен.',
            token: newToken,
            uniqueIdentifier: user.uniqueIdentifier,
          });
        }
      );
    }
  );
};

module.exports = { loginUser, refreshToken };
const jwt = require('jsonwebtoken');
const db = require('../../../database/dbSetup.cjs');
const { logger } = require('../../libs/logger.cjs');

function authenticateSocket(socket, next) {
  const token = socket.handshake.auth.token;
  const uniqueIdentifier = socket.handshake.auth.uniqueIdentifier;

  console.log('Auth data received:', { token, uniqueIdentifier });

  // Устанавливаем socket.user по умолчанию как гость
  socket.user = { isGuest: true };

  // Если нет токена или идентификатора, подключаем как гость
  if (!token || !uniqueIdentifier) {
    logger.warn('Guest connection: No token or unique identifier provided');
    return next();
  }

  // Проверяем токен JWT
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      logger.error('Invalid token:', err.message);
      return next(); // Подключаем как гость при невалидном токене
    }

    // Проверяем пользователя в базе данных
    db.get(
      'SELECT id, uniqueIdentifier, pixelCount FROM Users WHERE id = ?',
      [decoded.userId],
      (err, user) => {
        if (err) {
          logger.error('Database error:', err.message);
          return next(); // Подключаем как гость при ошибке базы данных
        }

        if (!user || user.uniqueIdentifier !== uniqueIdentifier) {
          logger.error('User not found or unique identifier mismatch');
          return next(); // Подключаем как гость, если пользователь не найден
        }

        socket.user = { ...decoded, pixelCount: user.pixelCount, isGuest: false };
        logger.info('Authentication successful for user:', decoded.userId);
        next();
      }
    );
  });
}

module.exports = { authenticateSocket };
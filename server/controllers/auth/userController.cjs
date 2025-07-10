const db = require('../../database/dbSetup.cjs');
const { logger } = require('../../utils/libs/logger.cjs');
const jwt = require('jsonwebtoken');

const getUser = (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Токен не предоставлен.' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ message: 'Недействительный токен.' });
    }

    db.get(
      'SELECT id, email, username, uniqueIdentifier FROM Users WHERE id = ?',
      [payload.userId],
      (err, user) => {
        if (err || !user) {
          logger.error(`Failed to fetch user ${payload.userId}: ${err?.message}`);
          return res.status(404).json({ message: 'Пользователь не найден.' });
        }

        res.status(200).json({
          message: 'Пользователь найден.',
          uniqueIdentifier: user.uniqueIdentifier,
          email: user.email,
          username: user.username,
        });
      }
    );
  });
};

module.exports = { getUser };
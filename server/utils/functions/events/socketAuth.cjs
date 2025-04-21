// utils/socketAuth.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../../../database/dbSetup.cjs');
const { logger } = require('../../libs/logger.cjs');

function authenticateSocket(socket, next) {
  const token = socket.handshake.auth.token;
  const uniqueIdentifier = socket.handshake.auth.uniqueIdentifier;

  if (!token || !uniqueIdentifier) {
    return next(new Error('Authentication error: Missing token or unique identifier'));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error: Invalid token'));
    }

    db.get(
      'SELECT uniqueIdentifier, pixelCount FROM Users WHERE id = ?',
      [decoded.userId],
      (err, user) => {
        if (err) {
          logger.error('Database error:', err);
          return next(new Error('Authentication error: Database error'));
        }

        if (!user || !user.uniqueIdentifier) {
          return next(new Error('Authentication error: User not found or unique identifier missing'));
        }

        const isIdentifierMatch = bcrypt.compareSync(uniqueIdentifier, user.uniqueIdentifier);
        if (!isIdentifierMatch) {
          return next(new Error('Authentication error: Unique identifier mismatch'));
        }

        socket.user = { ...decoded, pixelCount: user.pixelCount };
        next();
      }
    );
  });
}

module.exports = { authenticateSocket };

const db = require('../../database/dbSetup.cjs');
const { logger } = require('../../utils/libs/logger.cjs');
const { pendingRegistrations } = require('./registrationController.cjs');

const verifyUser = (req, res) => {
  const { email, confirmationCode } = req.body;

  logger.info(
    `Verification Attempt - Email: ${email}, Code: ${confirmationCode}`
  );

  const pendingUser = pendingRegistrations[email];

  if (!pendingUser || pendingUser.confirmationCode !== confirmationCode) {
    logger.error(`Verification Error - Invalid code for Email: ${email}`);
    return res.status(400).json({ message: 'Неверный код подтверждения.' });
  }

  db.get(
    'SELECT * FROM Users WHERE email = ?',
    [email],
    (err, existingUser) => {
      if (err) {
        logger.error(
          `Verification Error - Database error while checking user for Email: ${email} - ${err.message}`
        );
        return res
          .status(500)
          .json({ message: 'Ошибка проверки пользователя.' });
      }
      if (existingUser) {
        logger.error(
          `Verification Error - User already exists with Email: ${email}`
        );
        return res
          .status(400)
          .json({ message: 'Пользователь с таким email уже существует.' });
      }

      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS SinglePlayer_${pendingUser.uniqueIdentifier} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          x INTEGER,
          y INTEGER,
          color TEXT,
          userId TEXT,
          UNIQUE(x, y),
          FOREIGN KEY(userId) REFERENCES Users(id)
        )
      `;

      db.run(createTableQuery, (createTableErr) => {
        if (createTableErr) {
          logger.error(
            `Table Creation Error - Failed to create single-player table for ${email} - ${createTableErr.message}`
          );
          return res
            .status(500)
            .json({ message: 'Ошибка создания игрового пространства.' });
        }

        db.run(
          'INSERT INTO Users (email, username, password, confirmationCode, isVerified, canPlacePixel, pixelCount, uniqueIdentifier) VALUES (?, ?, ?, "", 1, 1, 100, ?)',
          [
            email,
            pendingUser.username,
            pendingUser.hashedPassword,
            pendingUser.uniqueIdentifier,
          ],
          (insertErr) => {
            if (insertErr) {
              logger.error(
                `Verification Error - Database insertion failed for Email: ${email} - ${insertErr.message}`
              );
              return res
                .status(500)
                .json({ message: 'Ошибка создания аккаунта.' });
            }

            logger.info(`Verification Successful - Email: ${email}`);
            delete pendingRegistrations[email];
            res.status(200).json({
              message: 'Успешная верификация. Теперь вы можете войти.',
            });
          }
        );
      });
    }
  );
};

module.exports = { verifyUser };

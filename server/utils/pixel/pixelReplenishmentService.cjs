const db = require('../../database/dbSetup.cjs');
const { logger } = require('../libs/logger.cjs');
const { Server } = require('socket.io');

class PixelReplenishmentService {
  constructor(io) {
    this.io = io;
    this.userTimers = new Map();
    this.globalTimer = null;
  }

  async start() {
    // Запускаем глобальную проверку всех пользователей
    this.globalTimer = setInterval(() => this.checkAllUsers(), 1000);
    logger.info('Pixel replenishment service started');
  }

  async stop() {
    clearInterval(this.globalTimer);
    this.userTimers.forEach((timer) => clearInterval(timer));
    this.userTimers.clear();
    logger.info('Pixel replenishment service stopped');
  }

  async checkAllUsers() {
    try {
      const users = await this.getUsersNeedingReplenishment();
      users.forEach((user) => this.processUserReplenishment(user));
    } catch (error) {
      logger.error(`Error in checkAllUsers: ${error.message}`);
    }
  }

  async getUsersNeedingReplenishment() {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT id, uniqueIdentifier, pixelCount, maxPixelCount, userPixelUpdateTime, lastPixelUpdate FROM Users WHERE pixelCount < maxPixelCount',
        (err, users) => {
          if (err) {
            reject(err);
          } else {
            resolve(users);
          }
        }
      );
    });
  }

  processUserReplenishment(user) {
    const now = Math.floor(Date.now() / 1000);
    const lastUpdate = user.lastPixelUpdate || 0;
    const updateInterval = user.userPixelUpdateTime || 5;

    if (now - lastUpdate >= updateInterval) {
      this.incrementUserPixelCount(user);
    }
  }

  incrementUserPixelCount(user) {
    const newPixelCount = Math.min(user.pixelCount + 1, user.maxPixelCount);
    const now = Math.floor(Date.now() / 1000);

    db.run(
      'UPDATE Users SET pixelCount = ?, lastPixelUpdate = ? WHERE id = ?',
      [newPixelCount, now, user.id],
      (err) => {
        if (err) {
          logger.error(
            `Error updating pixel count for user ${user.id}: ${err.message}`
          );
          return;
        }

        //* logger.info(
        //*   `Pixel count updated for user ${user.id}: ${newPixelCount}`
        //* );

        if (this.io) {
          this.io
            .to(`user_${user.uniqueIdentifier}`)
            .emit('user-pixel-count-update', {
              userId: user.id,
              newPixelCount: newPixelCount,
            });
        }
      }
    );
  }
}

module.exports = { PixelReplenishmentService };

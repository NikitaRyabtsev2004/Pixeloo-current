const db = require('../../database/dbSetup.cjs');
const { logger } = require('../libs/logger.cjs');

async function handlePixelDraw(
  x,
  y,
  color,
  userId,
  io,
  route,
  uniqueIdentifier
) {
  if (route === '/single-player-game' && (!uniqueIdentifier || uniqueIdentifier === 'undefined')) {
    logger.error(`Invalid uniqueIdentifier for single-player game: ${uniqueIdentifier}`);
    throw new Error('Invalid uniqueIdentifier for single-player game');
  }

  const tableName =
    route === '/single-player-game'
      ? `SinglePlayer_${uniqueIdentifier}`
      : route === '/canvas-2'
        ? 'Canvas2'
        : route === '/canvas-3'
          ? 'Canvas3'
          : 'Canvas';

  if (!tableName) {
    logger.error(`Invalid table name for route: ${route}`);
    throw new Error('Invalid table name');
  }

  try {
    if (route === '/single-player-game') {
      await new Promise((resolve, reject) => {
        db.run(`
          CREATE TABLE IF NOT EXISTS ${tableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            x INTEGER,
            y INTEGER,
            color TEXT,
            userId TEXT,
            UNIQUE(x, y)
          )
        `, (err) => {
          if (err) {
            logger.error(`Error ensuring SinglePlayer table ${tableName}: ${err.message}`);
            return reject(err);
          }
          //? logger.info(`SinglePlayer table ${tableName} ensured to exist`);
          resolve();
        });
      });
    }

    //? logger.info(
    //?   `Drawing pixel: table=${tableName}, x=${x}, y=${y}, color=${color}, userId=${userId}, route=${route}`
    //? );

    await new Promise((resolve, reject) => {
      db.get(
        `SELECT color FROM ${tableName} WHERE x = ? AND y = ?`,
        [x, y],
        (err, row) => {
          if (err) {
            logger.error(
              `Error checking pixel in ${tableName}: ${err.message}`
            );
            return reject(err);
          }

          const query = row
            ? `UPDATE ${tableName} SET color = ?, userId = ? WHERE x = ? AND y = ?`
            : `INSERT INTO ${tableName} (x, y, color, userId) VALUES (?, ?, ?, ?)`;

          const params = row ? [color, userId, x, y] : [x, y, color, userId];

          db.run(query, params, (err) => {
            if (err) {
              logger.error(
                `Error executing query in ${tableName}: ${err.message}`
              );
              return reject(err);
            }

            //? logger.info(`Pixel successfully saved to ${tableName}: x=${x}, y=${y}, color=${color}`);

            const roomName =
              route === '/single-player-game'
                ? `single_${uniqueIdentifier}`
                : route === '/canvas-1'
                  ? 'canvas1'
                  : route === '/canvas-2'
                    ? 'canvas2'
                    : 'canvas3';

            io.to(roomName).emit(
              route === '/single-player-game'
                ? 'pixel-drawn-single'
                : `pixel-drawn-${route.slice(-1)}`,
              [{ x, y, color }]
            );
            resolve();
          });
        }
      );
    });
  } catch (err) {
    logger.error(`Error in handlePixelDraw: ${err.message}`);
    throw err;
  }
}

module.exports = { handlePixelDraw };

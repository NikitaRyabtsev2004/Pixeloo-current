const db = require('../../database/dbSetup.cjs');
const { logger } = require('../libs/logger.cjs');

async function handlePixelDraw(x, y, color, userId, io, route, uniqueIdentifier) {
  const tableName = route === '/single-player-game' 
    ? `SinglePlayer_${uniqueIdentifier}`
    : route === '/canvas-2' ? 'Canvas2' 
    : route === '/canvas-3' ? 'Canvas3' 
    : 'Canvas';
  
  logger.info(`Отрисовка пикселя: table=${tableName}, x=${x}, y=${y}, color=${color}, userId=${userId}`);

  return new Promise((resolve, reject) => {
    db.get(`SELECT color FROM ${tableName} WHERE x = ? AND y = ?`, [x, y], (err, row) => {
      if (err) return reject(err);

      const query = row 
        ? `UPDATE ${tableName} SET color = ?, userId = ? WHERE x = ? AND y = ?`
        : `INSERT INTO ${tableName} (x, y, color, userId) VALUES (?, ?, ?, ?)`;

      const params = row 
        ? [color, userId, x, y] 
        : [x, y, color, userId];

      db.run(query, params, (err) => {
        if (err) return reject(err);
        
        const eventName = route === '/single-player-game'
          ? 'pixel-drawn-single'
          : `pixel-drawn-${route.slice(-1)}`;

        io.emit(eventName, [{ x, y, color }]);
        resolve();
      });
    });
  });
}

module.exports = { handlePixelDraw };

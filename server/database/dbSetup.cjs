const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const {
  generateUniqueIdentifier,
} = require('../utils/functions/generators.cjs');
const db = new sqlite3.Database('./canvas.db');

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        pendingEmail TEXT,
        pendingEmailConfirmationCode TEXT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        confirmationCode TEXT,
        isVerified INTEGER DEFAULT 0,
        canPlacePixel INTEGER DEFAULT 0,
        pixelCount INTEGER DEFAULT 0,
        maxPixelCount INTEGER DEFAULT 100, 
        uniqueIdentifier TEXT UNIQUE,
        subscription INTEGER DEFAULT 0,
        placedPixels INTEGER DEFAULT 0,
        coins INTEGER DEFAULT 0,
        userPixelUpdateTime INTEGER DEFAULT 5,
        authToken TEXT,
        authTokenExpires INTEGER,
        colorsUsed TEXT DEFAULT '',
    )`,
    () => {}
  );
  //canvas-1
  db.run(`
    CREATE TABLE IF NOT EXISTS Canvas (
      x INTEGER,
      y INTEGER,
      color INTEGER,
      userId TEXT,
      created_at TEXT DEFAULT (datetime('now', '+3 hours')),
      PRIMARY KEY (x, y)
    ) WITHOUT ROWID;
  `);
  //canvas-2
  db.run(`
    CREATE TABLE IF NOT EXISTS Canvas2 (
      x INTEGER,
      y INTEGER,
      color INTEGER,
      userId TEXT,
      created_at TEXT DEFAULT (datetime('now', '+3 hours')),
      PRIMARY KEY (x, y)
    ) WITHOUT ROWID;
  `);
  //canvas-3
  db.run(`
    CREATE TABLE IF NOT EXISTS Canvas3 (
      x INTEGER,
      y INTEGER,
      color INTEGER,
      userId TEXT,
      created_at TEXT DEFAULT (datetime('now', '+3 hours')),
      PRIMARY KEY (x, y)
    ) WITHOUT ROWID;
  `);
  //single-player
  // db.run(`
  //   CREATE TABLE IF NOT EXISTS SinglePlayerCanvas (
  //     id INTEGER PRIMARY KEY AUTOINCREMENT,
  //     x INTEGER,
  //     y INTEGER,
  //     color TEXT,
  //     userId TEXT,
  //     UNIQUE(x, y),
  //     FOREIGN KEY(userId) REFERENCES Users(id)
  //   )
  // `);

  // LeaderBoard-All
  db.run(`
  CREATE TABLE IF NOT EXISTS Leaderboard (
    userId INTEGER PRIMARY KEY,
    username TEXT NOT NULL,
    placedPixels INTEGER DEFAULT 0,
    FOREIGN KEY(userId) REFERENCES Users(id) ON DELETE CASCADE
  )
`);

  db.run(`
  CREATE TRIGGER IF NOT EXISTS sync_leaderboard_insert
  AFTER INSERT ON Users
  BEGIN
    INSERT INTO Leaderboard (userId, username, placedPixels)
    VALUES (NEW.id, NEW.username, NEW.placedPixels);
  END;
`);

  db.run(`
  CREATE TRIGGER IF NOT EXISTS sync_leaderboard_update
  AFTER UPDATE OF placedPixels, username ON Users
  BEGIN
    UPDATE Leaderboard
    SET placedPixels = NEW.placedPixels,
        username = NEW.username
    WHERE userId = NEW.id;
  END;
`);

  // LeaderBoard-Canvas-1
  db.run(`
    CREATE TABLE IF NOT EXISTS Leaderboard2 (
      userId INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      placedPixels INTEGER DEFAULT 0,
      FOREIGN KEY(userId) REFERENCES Users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS sync_leaderboard2_insert
    AFTER INSERT ON Canvas
    WHEN NEW.color <> '#FFFFFF'
    BEGIN
      INSERT INTO Leaderboard2 (userId, username, placedPixels)
      VALUES ((SELECT id FROM Users WHERE uniqueIdentifier = NEW.userId), 
            (SELECT username FROM Users WHERE uniqueIdentifier = NEW.userId), 1)
      ON CONFLICT(userId) DO UPDATE SET placedPixels = placedPixels + 1;
    END;
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS sync_leaderboard2_delete
    AFTER DELETE ON Canvas
    WHEN OLD.color <> '#FFFFFF'
    BEGIN
      UPDATE Leaderboard2
      SET placedPixels = placedPixels - 1
      WHERE userId = (SELECT id FROM Users WHERE uniqueIdentifier = OLD.userId)
      AND placedPixels > 0;
    END;
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS sync_leaderboard2_update
    AFTER UPDATE ON Canvas
    BEGIN
      -- Уменьшаем счётчик у старого пользователя, если старый цвет не белый, а новый белый
      UPDATE Leaderboard2
      SET placedPixels = placedPixels - 1
      WHERE userId = (SELECT id FROM Users WHERE uniqueIdentifier = OLD.userId)
        AND OLD.color <> '#FFFFFF'
        AND NEW.color = '#FFFFFF'
        AND placedPixels > 0;

      -- Увеличиваем счётчик у нового пользователя, если старый цвет был белым, а новый не белый
      INSERT INTO Leaderboard2 (userId, username, placedPixels)
      VALUES ((SELECT id FROM Users WHERE uniqueIdentifier = NEW.userId), 
            (SELECT username FROM Users WHERE uniqueIdentifier = NEW.userId), 1)
      ON CONFLICT(userId) DO UPDATE SET placedPixels = placedPixels + 1
      WHERE OLD.color = '#FFFFFF' AND NEW.color <> '#FFFFFF';

      -- Если цвет не белый и пользователь изменился, уменьшаем у старого и увеличиваем у нового
      UPDATE Leaderboard2
      SET placedPixels = placedPixels - 1
      WHERE userId = (SELECT id FROM Users WHERE uniqueIdentifier = OLD.userId)
        AND OLD.color <> '#FFFFFF'
        AND NEW.color <> '#FFFFFF'
        AND OLD.userId <> NEW.userId
        AND placedPixels > 0;

      INSERT INTO Leaderboard2 (userId, username, placedPixels)
      VALUES ((SELECT id FROM Users WHERE uniqueIdentifier = NEW.userId), 
            (SELECT username FROM Users WHERE uniqueIdentifier = NEW.userId), 1)
      ON CONFLICT(userId) DO UPDATE SET placedPixels = placedPixels + 1
      WHERE OLD.color <> '#FFFFFF' AND NEW.color <> '#FFFFFF' AND OLD.userId <> NEW.userId;
    END;
  `);

  // LeaderBoard-Canvas-2
  db.run(`
    CREATE TABLE IF NOT EXISTS Leaderboard3 (
      userId INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      placedPixels INTEGER DEFAULT 0,
      FOREIGN KEY(userId) REFERENCES Users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS sync_leaderboard3_insert
    AFTER INSERT ON Canvas2
    WHEN NEW.color <> '#FFFFFF'
    BEGIN
      INSERT INTO Leaderboard3 (userId, username, placedPixels)
      VALUES ((SELECT id FROM Users WHERE uniqueIdentifier = NEW.userId), 
            (SELECT username FROM Users WHERE uniqueIdentifier = NEW.userId), 1)
      ON CONFLICT(userId) DO UPDATE SET placedPixels = placedPixels + 1;
    END;
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS sync_leaderboard3_delete
    AFTER DELETE ON Canvas2
    WHEN OLD.color <> '#FFFFFF'
    BEGIN
      UPDATE Leaderboard3
      SET placedPixels = placedPixels - 1
      WHERE userId = (SELECT id FROM Users WHERE uniqueIdentifier = OLD.userId)
      AND placedPixels > 0;
    END;
  `);

  // LeaderBoard-Canvas-3
  db.run(`
    CREATE TABLE IF NOT EXISTS Leaderboard4 (
      userId INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      placedPixels INTEGER DEFAULT 0,
      FOREIGN KEY(userId) REFERENCES Users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS sync_leaderboard4_insert
    AFTER INSERT ON Canvas3
    WHEN NEW.color <> '#FFFFFF'
    BEGIN
      INSERT INTO Leaderboard4 (userId, username, placedPixels)
      VALUES ((SELECT id FROM Users WHERE uniqueIdentifier = NEW.userId), 
            (SELECT username FROM Users WHERE uniqueIdentifier = NEW.userId), 1)
      ON CONFLICT(userId) DO UPDATE SET placedPixels = placedPixels + 1;
    END;
  `);

  //

  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_leaderboard_username
    AFTER UPDATE OF username ON Users
    FOR EACH ROW
    BEGIN
        UPDATE Leaderboard SET username = NEW.username WHERE userId = NEW.id;
    END;
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_leaderboard2_username
    AFTER UPDATE OF username ON Users
    FOR EACH ROW
    BEGIN
        UPDATE Leaderboard2 SET username = NEW.username WHERE userId = NEW.id;
    END;
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_leaderboard3_username
    AFTER UPDATE OF username ON Users
    FOR EACH ROW
    BEGIN
        UPDATE Leaderboard3 SET username = NEW.username WHERE userId = NEW.id;
    END;
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_leaderboard4_username
    AFTER UPDATE OF username ON Users
    FOR EACH ROW
    BEGIN
        UPDATE Leaderboard4 SET username = NEW.username WHERE userId = NEW.id;
    END;
  `);

  // Инициализация данных в таблицах лидеров
  db.run(`
    INSERT OR REPLACE INTO Leaderboard (userId, username, placedPixels)
    SELECT id, username, placedPixels FROM Users;
  `);

  db.run(`
    INSERT OR REPLACE INTO Leaderboard2 (userId, username, placedPixels)
    SELECT u.id, u.username, COUNT(*)
    FROM Canvas c
    JOIN Users u ON u.uniqueIdentifier = c.userId
    WHERE c.color <> '#FFFFFF'
    GROUP BY u.id, u.username;
  `);

  db.run(`
    INSERT OR REPLACE INTO Leaderboard3 (userId, username, placedPixels)
    SELECT u.id, u.username, COUNT(*)
    FROM Canvas2 c
    JOIN Users u ON u.uniqueIdentifier = c.userId
    WHERE c.color <> '#FFFFFF'
    GROUP BY u.id, u.username;
  `);

  db.run(`
    INSERT OR REPLACE INTO Leaderboard4 (userId, username, placedPixels)
    SELECT u.id, u.username, COUNT(*)
    FROM Canvas3 c
    JOIN Users u ON u.uniqueIdentifier = c.userId
    WHERE c.color <> '#FFFFFF'
    GROUP BY u.id, u.username;
  `);

  //Achievements
  db.run(`
    CREATE TABLE IF NOT EXISTS Achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      firstAchive INTEGER DEFAULT 0,
      secondAchive INTEGER DEFAULT 0,
      thirdAchive INTEGER DEFAULT 0,
      fourthAchive INTEGER DEFAULT 0,
      fifthAchive INTEGER DEFAULT 0
    )
  `);
  //1
  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_firstAchive
    AFTER UPDATE OF placedPixels ON Users
    FOR EACH ROW
    WHEN NEW.placedPixels > 0
    BEGIN
        UPDATE Achievements
        SET firstAchive = 1
        WHERE username = NEW.username;
    END;
  `);

  //2
  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_secondAchive
    AFTER UPDATE OF placedPixels ON Users
    FOR EACH ROW
    WHEN NEW.placedPixels > 100 
    BEGIN
        UPDATE Achievements
        SET secondAchive = 1
        WHERE username = NEW.username;
    END;
  `);

  //3
  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_thirdAchive
    AFTER UPDATE OF placedPixels ON Users
    FOR EACH ROW
    WHEN NEW.placedPixels > 999
    BEGIN
        UPDATE Achievements
        SET thirdAchive = 1
        WHERE username = NEW.username;
    END;
  `);

  //4
  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_fourthAchive
    AFTER UPDATE OF placedPixels ON Users
    FOR EACH ROW
    WHEN NEW.placedPixels > 9999
    BEGIN
        UPDATE Achievements
        SET fourthAchive = 1
        WHERE username = NEW.username;
    END;
  `);

  //5
  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_fifthAchive
    AFTER UPDATE OF colorsUsed ON Users
    FOR EACH ROW
    WHEN (
      LENGTH(NEW.colorsUsed) - LENGTH(REPLACE(NEW.colorsUsed, ',', '')) + 1 > 49
    )
    BEGIN
      UPDATE Achievements
      SET fifthAchive = 1
      WHERE username = NEW.username;
    END;
  `);

  db.run(`
    INSERT OR IGNORE INTO Achievements (username)
    SELECT username FROM Users;
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS insert_user_into_achievements
    AFTER INSERT ON Users
    FOR EACH ROW
    BEGIN
      INSERT INTO Achievements (username)
      VALUES (NEW.username);
    END;
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_user_in_achievements
    AFTER UPDATE OF username ON Users
    FOR EACH ROW
    BEGIN
      UPDATE Achievements
      SET username = NEW.username
      WHERE username = OLD.username;
    END;
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS delete_user_from_achievements
    AFTER DELETE ON Users
    FOR EACH ROW
    BEGIN
      DELETE FROM Achievements
      WHERE username = OLD.username;
    END;
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_user_colors_used
    AFTER INSERT ON Canvas
    WHEN NEW.color IS NOT NULL AND NEW.userId IS NOT NULL
    BEGIN
        UPDATE Users 
        SET colorsUsed = (
            SELECT GROUP_CONCAT(DISTINCT color)
            FROM (
                SELECT color FROM Canvas WHERE userId = NEW.userId AND color IS NOT NULL
                UNION
                SELECT color FROM Canvas2 WHERE userId = NEW.userId AND color IS NOT NULL
                UNION
                SELECT color FROM Canvas3 WHERE userId = NEW.userId AND color IS NOT NULL
            )
            WHERE color IS NOT NULL
        )
        WHERE uniqueIdentifier = NEW.userId;
    END;
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_user_colors_used_canvas2
    AFTER INSERT ON Canvas2
    WHEN NEW.color IS NOT NULL AND NEW.userId IS NOT NULL
    BEGIN
        UPDATE Users 
        SET colorsUsed = (
            SELECT GROUP_CONCAT(DISTINCT color)
            FROM (
                SELECT color FROM Canvas WHERE userId = NEW.userId AND color IS NOT NULL
                UNION
                SELECT color FROM Canvas2 WHERE userId = NEW.userId AND color IS NOT NULL
                UNION
                SELECT color FROM Canvas3 WHERE userId = NEW.userId AND color IS NOT NULL
            )
            WHERE color IS NOT NULL
        )
        WHERE uniqueIdentifier = NEW.userId;
    END;
  `);

  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_user_colors_used_canvas3
    AFTER INSERT ON Canvas3
    WHEN NEW.color IS NOT NULL AND NEW.userId IS NOT NULL
    BEGIN
        UPDATE Users 
        SET colorsUsed = (
            SELECT GROUP_CONCAT(DISTINCT color)
            FROM (
                SELECT color FROM Canvas WHERE userId = NEW.userId AND color IS NOT NULL
                UNION
                SELECT color FROM Canvas2 WHERE userId = NEW.userId AND color IS NOT NULL
                UNION
                SELECT color FROM Canvas3 WHERE userId = NEW.userId AND color IS NOT NULL
            )
            WHERE color IS NOT NULL
        )
        WHERE uniqueIdentifier = NEW.userId;
    END;
  `);

  //id generator
  // const generateUniqueIdentifier = () => {
  //   const chars =
  //     'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  //   let identifier = '';
  //   for (let i = 0; i < 10; i++) {
  //     identifier += chars.charAt(Math.floor(Math.random() * chars.length));
  //   }
  //   return identifier;
  // };
  // admin account
  bcrypt.hash('Qwe12345!', 10, (err, hashedPassword) => {
    const uniqueIdentifier = generateUniqueIdentifier();
    const hashedIdentifier = bcrypt.hashSync(uniqueIdentifier, 10);
    db.run(
      `INSERT OR IGNORE INTO Users
         (email, username, password, confirmationCode, isVerified, canPlacePixel, pixelCount, maxPixelCount, subscription, uniqueIdentifier)
         VALUES ('nekita118118@gmail.com', 'Nikita111', ?, '', 1, 1, 100, 100, 0, ?)`,
      [hashedPassword, hashedIdentifier],
      () => {}
    );
  });
  // bcrypt.hash('qwe123123!', 10, (err, hashedPassword) => {
  //   const uniqueIdentifier = generateUniqueIdentifier();
  //   const hashedIdentifier = bcrypt.hashSync(uniqueIdentifier, 10);
  //   db.run(
  //     `INSERT OR IGNORE INTO Users
  //        (email, username, password, confirmationCode, isVerified, canPlacePixel, pixelCount, maxPixelCount, subscription, uniqueIdentifier)
  //        VALUES ('test@test.com', 'nekitka', ?, '', 1, 1, 100, 100, 0, ?)`,
  //     [hashedPassword, hashedIdentifier],
  //     () => {}
  //   );
  // });
});

module.exports = db;

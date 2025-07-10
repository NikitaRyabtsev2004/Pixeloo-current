const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../../canvas.db');
//drop
db.run(`DROP TRIGGER IF EXISTS sync_leaderboard_insert`);
db.run(`DROP TRIGGER IF EXISTS sync_leaderboard_update`);
db.run(`DROP TABLE IF EXISTS Leaderboard`);

db.run(`DROP TRIGGER IF EXISTS sync_leaderboard2_insert`);
db.run(`DROP TRIGGER IF EXISTS sync_leaderboard2_delete`);
db.run(`DROP_TRIGGER IF EXISTS sync_leaderboard2_update`);
db.run(`DROP TABLE IF EXISTS Leaderboard2`);

db.run(`DROP TRIGGER IF EXISTS sync_leaderboard3_insert`);
db.run(`DROP TRIGGER IF EXISTS sync_leaderboard3_delete`);
db.run(`DROP TRIGGER IF EXISTS sync_leaderboard3_update`);
db.run(`DROP TABLE IF EXISTS Leaderboard3`);

db.run(`DROP TRIGGER IF EXISTS sync_leaderboard4_insert`);
db.run(`DROP TRIGGER IF EXISTS sync_leaderboard4_delete`);
db.run(`DROP TRIGGER IF EXISTS sync_leaderboard4_update`);
db.run(`DROP TABLE IF EXISTS Leaderboard4`);

// drop colors

// db.run(`
//     CREATE TRIGGER IF NOT EXISTS update_user_colors_after_delete
//     AFTER DELETE ON Canvas
//     WHEN OLD.color IS NOT NULL AND OLD.userId IS NOT NULL
//     BEGIN
//         UPDATE Users 
//         SET colorsUsed = (
//             SELECT GROUP_CONCAT(DISTINCT color, ',')
//             FROM (
//                 SELECT color FROM Canvas WHERE userId = OLD.userId AND color IS NOT NULL
//                 UNION
//                 SELECT color FROM Canvas2 WHERE userId = OLD.userId AND color IS NOT NULL
//                 UNION
//                 SELECT color FROM Canvas3 WHERE userId = OLD.userId AND color IS NOT NULL
//             )
//             WHERE color IS NOT NULL
//         )
//         WHERE uniqueIdentifier = OLD.userId;
//     END;

//     -- Аналогичные триггеры для Canvas2 и Canvas3
//     `)
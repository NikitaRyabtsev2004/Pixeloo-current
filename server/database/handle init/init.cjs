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
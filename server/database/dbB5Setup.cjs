const sqlite3 = require('sqlite3').verbose();
const dbB5 = new sqlite3.Database('./battle5.db');

dbB5.serialize(() => {
  //P1
  dbB5.run(`
      CREATE TABLE IF NOT EXISTS P1 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        x INTEGER,
        y INTEGER,
        color TEXT,
        userId TEXT,
        UNIQUE(x, y),
        FOREIGN KEY(userId) REFERENCES Users(id)
      )
    `);
  //P2
  dbB5.run(`
      CREATE TABLE IF NOT EXISTS P2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        x INTEGER,
        y INTEGER,
        color TEXT,
        userId TEXT,
        UNIQUE(x, y),
        FOREIGN KEY(userId) REFERENCES Users(id)
      )
    `);
  //P3
  dbB5.run(`
      CREATE TABLE IF NOT EXISTS P3 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        x INTEGER,
        y INTEGER,
        color TEXT,
        userId TEXT,
        UNIQUE(x, y),
        FOREIGN KEY(userId) REFERENCES Users(id)
      )
    `);
  //P4
  dbB5.run(`
      CREATE TABLE IF NOT EXISTS P4 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        x INTEGER,
        y INTEGER,
        color TEXT,
        userId TEXT,
        UNIQUE(x, y),
        FOREIGN KEY(userId) REFERENCES Users(id)
      )
    `);
  //P5
  dbB5.run(`
      CREATE TABLE IF NOT EXISTS P5 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        x INTEGER,
        y INTEGER,
        color TEXT,
        userId TEXT,
        UNIQUE(x, y),
        FOREIGN KEY(userId) REFERENCES Users(id)
      )
    `);
  //P6
  dbB5.run(`
      CREATE TABLE IF NOT EXISTS P6 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        x INTEGER,
        y INTEGER,
        color TEXT,
        userId TEXT,
        UNIQUE(x, y),
        FOREIGN KEY(userId) REFERENCES Users(id)
      )
    `);
  //P7
  dbB5.run(`
      CREATE TABLE IF NOT EXISTS P7 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        x INTEGER,
        y INTEGER,
        color TEXT,
        userId TEXT,
        UNIQUE(x, y),
        FOREIGN KEY(userId) REFERENCES Users(id)
      )
    `);
  //P8
  dbB5.run(`
      CREATE TABLE IF NOT EXISTS P8 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        x INTEGER,
        y INTEGER,
        color TEXT,
        userId TEXT,
        UNIQUE(x, y),
        FOREIGN KEY(userId) REFERENCES Users(id)
      )
    `);
});

module.exports = dbB5
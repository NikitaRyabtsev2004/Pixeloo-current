const sqlite3 = require('sqlite3').verbose();
const dbB1 = new sqlite3.Database('./battle1.db');

dbB1.serialize(() => {
  //P1
  dbB1.run(`
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
  dbB1.run(`
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
  dbB1.run(`
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
  dbB1.run(`
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
  dbB1.run(`
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
  dbB1.run(`
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
  dbB1.run(`
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
  dbB1.run(`
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

module.exports = dbB1
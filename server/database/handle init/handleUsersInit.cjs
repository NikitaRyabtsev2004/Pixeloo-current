const bcrypt = require('bcrypt');
const {
  generateUniqueIdentifier,
  generateRandomCode,
} = require('../../utils/functions/generators.cjs');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../../canvas.db');

const createMultipleUsers = (count) => {
  const users = [];
  const password = 'Qwe12345!';

  for (let i = 0; i < count; i++) {
    const username = `Username${i + 1}`;
    console.log(username)
    const email = `test${i + 1}@test.ru`;

    const uniqueIdentifier = generateUniqueIdentifier();

    const randomCode = generateRandomCode()

    const hashedPassword = bcrypt.hashSync(password, 10);
    console.log(hashedPassword)

    users.push({
      email: email,
      username: username,
      password: hashedPassword,
      confirmationCode: randomCode,
      uniqueIdentifier: uniqueIdentifier,
    });
  }

  return users;
};

const users = createMultipleUsers(20);

users.forEach((user) => {
  console.log("Inserting user:", user.email);
  db.run(
    `INSERT OR IGNORE INTO Users (email, username, password, confirmationCode, isVerified, canPlacePixel, pixelCount, maxPixelCount, subscription, uniqueIdentifier) VALUES (?, ?, ?, ?, 1, 1, 100, 100, 0, ?)`,
    [
      user.email,
      user.username,
      user.password,
      user.confirmationCode,
      user.uniqueIdentifier,
    ]
  )
});

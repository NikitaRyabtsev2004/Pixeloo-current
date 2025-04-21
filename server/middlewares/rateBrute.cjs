const expressBrute = require('express-brute');

const store = new expressBrute.MemoryStore();
const bruteforce = new expressBrute(store, {
  freeRetries: 100,
  minWait: 1000,
  maxWait: 5000,
});

module.exports = { bruteforce };
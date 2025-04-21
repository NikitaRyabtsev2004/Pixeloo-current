const { createClient } = require('redis');

const redisClientPublic = createClient({
  url: process.env.REDIS_URL,
});
const redisClientSubscription = createClient({
  url: process.env.REDIS_URL,
});

module.exports = {
  redisClientPublic,
  redisClientSubscription,
};
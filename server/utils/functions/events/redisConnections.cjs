// utils/redisConnection.js
const { redisClientPublic, redisClientSubscription } = require('../../libs/redis.cjs');
const { logger } = require('../../libs/logger.cjs');

async function connectRedis() {
  try {
    await redisClientPublic.connect();
    await redisClientSubscription.connect();
    logger.info('Connected to Redis');
  } catch (err) {
    logger.error(`Could not connect to Redis: ${err.message}`);
    throw err;
  }

  redisClientPublic.on('error', (err) => {
    logger.error(`Redis Publisher Error: ${err.message}`);
    throw err;
  });

  redisClientSubscription.on('error', (err) => {
    logger.error(`Redis Subscriber Error: ${err.message}`);
    throw err;
  });
}

module.exports = { connectRedis };

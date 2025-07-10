/* eslint-disable linebreak-style */
const winston = require('winston');
const moment = require('moment-timezone');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: () => moment().tz('Europe/Moscow').format(),
    }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: process.env.COMBINED_LOG }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          (info) => `[${info.timestamp}] ${info.level}: ${info.message}`
        )
      ),
    }),
  ],
});

module.exports = { logger };

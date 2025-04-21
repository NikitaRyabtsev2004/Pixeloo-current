const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 20 * 1000,
  max: 1000,
  message: 'Слишком много запросов, попробуйте позже',
});

const createPaymentLimiter = rateLimit({
  windowMs: 20 * 1000,
  max: 500,
  message: 'Превышен лимит запросов на создание платежей',
});

const checkPaymentLimiter = rateLimit({
  windowMs: 20 * 1000,
  max: 1000,
  message: {
    status: 429,
    error:
      'Превышен лимит запросов на проверку статуса платежей. Попробуйте позже.',
  },
});

module.exports = { limiter, createPaymentLimiter, checkPaymentLimiter };

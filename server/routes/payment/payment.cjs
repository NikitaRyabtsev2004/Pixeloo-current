const express = require('express');
const {
  createPayment,
} = require('../../controllers/payment/createPaymentController.cjs');
const {
  checkPayment,
} = require('../../controllers/payment/checkPaymentController.cjs');
const {
  createPaymentLimiter,
  checkPaymentLimiter
} = require('../../middlewares/rateLimiter.cjs');
const paymentRouter = express.Router();

paymentRouter.post('/create-payment', createPayment);
paymentRouter.get(
  '/check-payment/:paymentId',
  checkPaymentLimiter,
  checkPayment
);

module.exports = paymentRouter;

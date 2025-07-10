/* eslint-disable linebreak-style */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const xss = require('xss-clean');
const { bruteforce } = require('../middlewares/rateBrute.cjs');
const { limiter, createPaymentLimiter, checkPaymentLimiter } = require('../middlewares/rateLimiter.cjs');
const expressWinston = require('express-winston');
const winston = require('winston');

const authRoutes = require('./auth/auth.cjs');
const paymentRoutes = require('./payment/payment.cjs');
const { router: imageRouter } = require('../images/canvasImageGenerator.cjs');

const app = express();

const corsOptions = {
  origin: process.env.CLIENT_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// Apply CORS middleware for API routes
app.use(cors(corsOptions));

// Middleware
app.use(xss());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bruteforce.prevent);
app.use(limiter);
app.use('/api/payment', createPaymentLimiter);
app.use('/api/payment/status', checkPaymentLimiter);

// Static file serving with CORS headers
app.use('/images', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Allow cross-origin image loading
  next();
}, express.static('canvas_images'));

// API routes
app.use('/', imageRouter);
app.use('/srv/auth', authRoutes);
app.use('/api', paymentRoutes);

// Request logging
app.use(
  expressWinston.logger({
    transports: [
      new winston.transports.File({ filename: process.env.REQUESTS_LOG }),
    ],
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    meta: true,
    msg: 'HTTPS {{req.method}} {{req.url}}',
    expressFormat: true,
    colorize: false,
    ignoreRoute: function () {
      return false;
    },
  })
);

module.exports = app;
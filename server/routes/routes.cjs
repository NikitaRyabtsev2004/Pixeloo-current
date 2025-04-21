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

const app = express();

app.use(xss());
app.use(helmet()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));  
app.use(bruteforce.prevent); 

app.use(limiter); 
app.use('/api/payment', createPaymentLimiter);
app.use('/api/payment/status', checkPaymentLimiter);

const corsOptions = {
  origin: 'http://localhost:4000', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
  allowedHeaders: ['Content-Type', 'Authorization'], 
  credentials: true, 
};

app.use(cors(corsOptions));


app.options('*', cors(corsOptions));


app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});


app.use(
  expressWinston.logger({
    transports: [
      new winston.transports.File({ filename: process.env.REQUESTS_LOG }), // Логирование в файл
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

// Маршруты
app.use('/srv/auth', authRoutes);
app.use('/api', paymentRoutes);  

module.exports = app;

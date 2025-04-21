const path = require('path');
const fs = require('fs');
require('dotenv').config();

module.exports.sslOptions = {
  key: process.env.KEY_PEM,
  cert: process.env.CERT_PEM,
  ca: process.env.CHAIN_PEM,
};
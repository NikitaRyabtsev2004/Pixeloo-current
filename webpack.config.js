const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  optimization: {
    splitChunks: {
      chunks: 'none',
    },
  },
  module: {
    rules: [
    ],
  },
  devtool: false,
};

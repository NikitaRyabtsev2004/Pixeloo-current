const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.js',  // Укажите ваш основной файл
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',  // Все в одном бандле
    clean: true,  // Очищать папку dist перед сборкой
  },
  optimization: {
    splitChunks: {
      chunks: 'none',  // Отключаем разделение на чанки
    },
  },
  module: {
    rules: [
      // Ваши правила для обработки js, css, и других файлов
    ],
  },
  devtool: false,  // Отключаем source maps
};

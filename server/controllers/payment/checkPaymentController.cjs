/* eslint-disable linebreak-style */
/* eslint-disable no-console */
const axios = require('axios');
const { logger } = require('../../utils/libs/logger.cjs');

// Кэш для статусов платежей
const paymentCache = new Map();
const CACHE_TTL = 20000;

const checkPayment = async (req, res) => {
  const { paymentId } = req.params;

  // Проверяем наличие ID платежа
  if (!paymentId) {
    return res.status(400).json({ message: 'Отсутствует ID платежа' });
  }

  // Проверяем кэш на наличие статуса платежа
  const cachedPayment = paymentCache.get(paymentId);
  if (cachedPayment && Date.now() - cachedPayment.timestamp < CACHE_TTL) {
    console.log(`Возврат статуса платежа ID: ${paymentId} из кэша`);
    return res.status(200).json({ status: cachedPayment.status });
  }

  try {
    // Выполняем запрос к API YooKassa
    const response = await axios.get(
      `https://api.yookassa.ru/v3/payments/${paymentId}`,
      {
        auth: {
          username: process.env.SHOP_ID,
          password: process.env.SECRET_KEY,
        },
      }
    );

    const status = response.data.status;

    // Сохраняем статус в кэш
    paymentCache.set(paymentId, { status, timestamp: Date.now() });

    logger.info(`Платеж ID: ${paymentId} проверен успешно. Статус: ${status}`);

    // Возвращаем статус платежа
    res.status(200).json({ status });
  } catch (error) {
    // Логируем ошибку и возвращаем клиенту сообщение
    const errorMessage = error.response?.data || error.message;
    console.error(
      `Ошибка при проверке статуса платежа ID: ${paymentId}`,
      errorMessage
    );

    res.status(500).json({
      message: 'Не удалось проверить статус платежа',
      error: errorMessage,
    });
  }
};

// Функция для очистки устаревших записей в кэше
const clearOldCacheEntries = () => {
  const now = Date.now();
  for (const [key, value] of paymentCache.entries()) {
    if (now - value.timestamp >= CACHE_TTL) {
      paymentCache.delete(key);
    }
  }
};

setInterval(clearOldCacheEntries, 100000);

module.exports = { checkPayment };

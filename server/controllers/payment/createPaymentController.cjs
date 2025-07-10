/* eslint-disable linebreak-style */
/* eslint-disable no-console */
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { logger } = require('../../utils/libs/logger.cjs');

const paymentCache = new Map();
const CACHE_TTL = 120000;

const createPayment = async (req, res) => {
  const { amount, description } = req.body;

  const idempotenceKey = uuidv4();

  const paymentData = {
    amount: {
      value: amount.toFixed(2),
      currency: 'RUB',
    },
    description: description,
    confirmation: {
      type: 'redirect',
      return_url: `${process.env.CLIENT_URL}`,
    },
    capture: true,
  };

  try {
    const response = await axios.post(
      'https://api.yookassa.ru/v3/payments',
      paymentData,
      {
        headers: {
          'Idempotence-Key': idempotenceKey,
          'Content-Type': 'application/json',
        },
        auth: {
          username: process.env.SHOP_ID,
          password: process.env.SECRET_KEY,
        },
      }
    );
    logger.info('Создан платеж с ID:', response.data.id);
    res.status(200).json({
      paymentId: response.data.id,
      confirmationUrl: response.data.confirmation.confirmation_url,
    });
  } catch (error) {
    logger.error(
      'Ошибка при создании платежа:',
      error.response?.data || error.message
    );
    res.status(500).json({ message: 'Не удалось создать платеж' });
  }
};

const checkPayment = async (req, res) => {
  const { paymentId } = req.params;

  // Проверяем наличие статуса в кэше
  const cachedPayment = paymentCache.get(paymentId);
  if (cachedPayment && Date.now() - cachedPayment.timestamp < CACHE_TTL) {
    logger.info(`Возврат статуса платежа ID: ${paymentId} из кэша`);
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
    logger.error(
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

// Запускаем очистку кэша каждые 5 минут
setInterval(clearOldCacheEntries, 300000);

module.exports = { createPayment, checkPayment };

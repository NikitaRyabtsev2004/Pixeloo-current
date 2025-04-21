import axios from 'axios';
import { useNotifications } from '../../helpers/notifications';
import { handleUpdateMaxPixelCount } from '../pixels/updateMaxPixelCount';

export const doPayment = async (
  paymentAmount,
  pixelCount = null,
  socket,
  showDonationAlert,
  showDonationMakeError,
  showDonationSucces,
  showDonationError
) => {
  if (!paymentAmount || isNaN(paymentAmount) || paymentAmount <= 0) {
    showDonationAlert();
    return;
  }

  try {
    const serverUrl = process.env.REACT_APP_SERVER;

    const { confirmationUrl, paymentId } = await createPayment(
      serverUrl,
      paymentAmount,
      pixelCount
    );

    window.open(confirmationUrl, '_blank');

    await monitorPaymentStatus(
      serverUrl,
      paymentId,
      pixelCount,
      socket,
      showDonationSucces,
      showDonationError
    );
  } catch (error) {
    console.error('Ошибка выполнения платежа:', error.message || error);
    showDonationMakeError();
  }
};

const createPayment = async (serverUrl, paymentAmount, pixelCount) => {
  const maxRetries = 5;

  for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
    try {
      const response = await axios.post(`${serverUrl}/api/create-payment`, {
        amount: paymentAmount,
        description: pixelCount ? 'Оплата подписки' : 'Произвольная оплата',
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 429 && retryCount < maxRetries - 1) {
        const waitTime = Math.pow(2, retryCount) * 500;
        console.warn(
          `Превышено количество запросов. Повторная попытка через ${waitTime} мс...`
        );
        await delay(waitTime);
      } else {
        throw new Error(
          'Не удалось создать платеж: ' +
            (error.response?.data?.message || error.message)
        );
      }
    }
  }

  throw new Error('Превышено количество попыток создания платежа.');
};

const monitorPaymentStatus = async (
  serverUrl,
  paymentId,
  pixelCount,
  socket,
  showDonationSucces,
  showDonationError
) => {
  const pollingInterval = 3000;
  const maxAttempts = 20;
  let attempts = 0;

  const interval = setInterval(async () => {
    attempts++;

    try {
      const response = await axios.get(
        `${serverUrl}/api/check-payment/${paymentId}`
      );
      const { status } = response.data;

      if (status === 'succeeded') {
        clearInterval(interval);

        if (pixelCount) {
          handleUpdateMaxPixelCount(pixelCount, socket);
        }

        showDonationSucces();
      } else if (
        ['canceled', 'failed'].includes(status) ||
        attempts >= maxAttempts
      ) {
        clearInterval(interval);
        showDonationError();
      }
    } catch (error) {
      console.error(
        'Ошибка при проверке статуса платежа:',
        error.message || error
      );

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        showDonationError();
      }
    }
  }, pollingInterval);
};

// Функция для паузы (задержки)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

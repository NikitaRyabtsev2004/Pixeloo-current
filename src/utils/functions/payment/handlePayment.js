import axios from 'axios';
import { handleUpdateMaxPixelCount } from '../pixels/updateMaxPixelCount';

export const doPayment = async (
  paymentAmount,
  pixelCount = null,
  socket,
  showDonationAlert,
  showDonationMakeError,
  showDonationSuccess,
  showDonationError,
  isColorSubscription = false,
  coinsToAdd = null
) => {
  if (!paymentAmount || isNaN(paymentAmount) || paymentAmount <= 0) {
    showDonationAlert();
    return;
  }

  try {
    const serverUrl = process.env.REACT_APP_SERVER;
    const {
      confirmationUrl,
      paymentId,
      coinsToAdd: responseCoins,
    } = await createPayment(
      serverUrl,
      paymentAmount,
      pixelCount,
      isColorSubscription,
      coinsToAdd
    );

    window.open(confirmationUrl, '_blank');

    await monitorPaymentStatus(
      serverUrl,
      paymentId,
      pixelCount,
      socket,
      showDonationSuccess,
      showDonationError,
      isColorSubscription,
      responseCoins || coinsToAdd
    );
  } catch (error) {
    showDonationMakeError();
  }
};

const createPayment = async (
  serverUrl,
  paymentAmount,
  pixelCount,
  isColorSubscription,
  coinsToAdd
) => {
  const maxRetries = 3;

  for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
    try {
      const response = await axios.post(`${serverUrl}/api/create-payment`, {
        amount: paymentAmount,
        description: coinsToAdd
          ? `Покупка ${coinsToAdd} монет`
          : isColorSubscription
            ? 'Подписка Color Selector'
            : pixelCount
              ? 'Оплата подписки на пиксели'
              : 'Произвольная оплата',
        isColorSubscription,
        coinsToAdd,
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 429 && retryCount < maxRetries - 1) {
        const waitTime = Math.pow(2, retryCount) * 500;
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
  showDonationSuccess,
  showDonationError,
  isColorSubscription,
  coinsToAdd
) => {
  const pollingInterval = 3000;
  const maxAttempts = 100;
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      attempts++;

      try {
        const response = await axios.get(
          `${serverUrl}/api/check-payment/${paymentId}`
        );
        const { status, coinsToAdd: responseCoins } = response.data;

        if (status === 'succeeded') {
          clearInterval(interval);

          if (isColorSubscription) {
            socket.emit(
              'update-color-subscription',
              { isColorSubscription: true },
              (response) => {
                if (response?.success) {
                  showDonationSuccess(
                    'Подписка на выбор цвета успешно активирована!'
                  );
                  resolve();
                } else {
                  showDonationError(
                    'Ошибка активации подписки на выбор цвета.'
                  );
                  reject(new Error('Failed to update color subscription'));
                }
              }
            );
          } else if (pixelCount) {
            handleUpdateMaxPixelCount(pixelCount, socket);
            showDonationSuccess(`Успешно добавлено ${pixelCount} пикселей!`);
            resolve();
          } else if (responseCoins || coinsToAdd) {
            const coins = responseCoins || coinsToAdd;
            socket.emit('purchase-coins', { coins }, (response) => {
              if (response?.success) {
                showDonationSuccess(`Успешно куплено ${coins} монет!`);
                resolve();
              } else {
                showDonationError('Ошибка при добавлении монет.');
                reject(new Error('Failed to add coins'));
              }
            });
          } else {
            showDonationSuccess('Платеж успешно завершен!');
            resolve();
          }
        } else if (
          ['canceled', 'failed'].includes(status) ||
          attempts >= maxAttempts
        ) {
          clearInterval(interval);
          showDonationError('Платеж не выполнен или превышено время ожидания.');
          reject(new Error('Payment failed or timed out'));
        }
      } catch (error) {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          showDonationError(
            'Превышено время ожидания проверки статуса платежа.'
          );
          reject(new Error('Payment status check timed out'));
        }
      }
    }, pollingInterval);
  });
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

import React from 'react';
import { doPayment } from '../../../../../../utils/functions/payment/handlePayment';
import { useNotifications } from '../../../../../../utils/helpers/notifications';

const Coins = ({ setIsState, socket }) => {
  const {
    showDonationAlert,
    showDonationMakeError,
    showDonationSuccess,
    showDonationError,
  } = useNotifications();

  const coinPackages = [
    { coins: 200, price: 99 },
    { coins: 500, price: 219 },
    { coins: 1000, price: 429 },
    { coins: 5000, price: 1999 },
  ];

  const handleCoinPurchase = (coins, price) => {
    if (!socket || typeof socket.emit !== 'function') {
      showDonationError('Ошибка соединения с сервером');
      return;
    }
    doPayment(
      price,
      null,
      socket,
      showDonationAlert,
      showDonationMakeError,
      () => showDonationSuccess(`Успешно куплено ${coins} монет!`),
      showDonationError,
      false,
      coins 
    );
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginTop: '10px',
        }}
      >
        <h4 style={{ margin: '0' }}>Купить монеты</h4>
        {coinPackages.map((pkg) => (
          <button
            key={pkg.coins}
            onClick={() => handleCoinPurchase(pkg.coins, pkg.price)}
            className='Coin__boost'
          >
            {pkg.coins} монет за {pkg.price}₽
          </button>
        ))}
      </div>
      <div className="menu__switch__buttons">
        <button onClick={() => setIsState(0)}>Главная</button>
      </div>
    </>
  );
};

export default Coins;

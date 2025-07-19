import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../../../../utils/helpers/notifications';
import Boosts from './Shop-folders/Boosts';
import Color from './Shop-folders/Color';
import Coins from './Shop-folders/Coins';

const Shop = ({ onBack, initialCoins, socket }) => {
  const [activeBoost, setActiveBoost] = useState(null);
  const [coins, setCoins] = useState(initialCoins);
  const {
    showInsufficientCoinsNotification,
    showBoostPurchaseError,
    showBoostPurchaseSuccess,
    showBoostReplaceConfirmation,
  } = useNotifications();
  const [isState, setIsState] = useState(0);

  const boosts = [
    {
      name: 'X2 6h',
      multiplier: 2,
      duration: 6 * 60 * 60,
      cost: 150,
      updateTime: 5,
    },
    {
      name: 'X2 24h',
      multiplier: 2,
      duration: 24 * 60 * 60,
      cost: 450,
      updateTime: 5,
    },
    {
      name: 'X2 3d',
      multiplier: 2,
      duration: 3 * 24 * 60 * 60,
      cost: 1300,
      updateTime: 5,
    },
    {
      name: 'X5 6h',
      multiplier: 5,
      duration: 6 * 60 * 60,
      cost: 400,
      updateTime: 2,
    },
    {
      name: 'X5 24h',
      multiplier: 5,
      duration: 24 * 60 * 60,
      cost: 1200,
      updateTime: 2,
    },
    {
      name: 'X5 3d',
      multiplier: 5,
      duration: 3 * 24 * 60 * 60,
      cost: 2550,
      updateTime: 2,
    },
    {
      name: 'X10 6h',
      multiplier: 10,
      duration: 6 * 60 * 60,
      cost: 1000,
      updateTime: 1,
    },
  ];

  useEffect(() => {
    if (socket && typeof socket.on === 'function') {
      socket.emit('get-active-boost');
      socket.on('active-boost-update', (data) => {
        setActiveBoost(data.activeBoost);
      });

      socket.emit('get-coins');
      socket.on('get-coins', (data) => {
        setCoins(data.coins);
      });

      socket.on('user-coins', (data) => {
        setCoins(data.coins);
      });

      return () => {
        socket.off('active-boost-update');
        socket.off('get-coins');
        socket.off('user-coins');
      };
    }
  }, [socket]);

  const handlePurchase = (boost) => {
    if (coins < boost.cost) {
      showInsufficientCoinsNotification();
      return;
    }

    if (activeBoost && activeBoost.name !== boost.name) {
      showBoostReplaceConfirmation(boost.name, () => {
        socket.emit(
          'purchase-boost',
          {
            boostName: boost.name,
            cost: boost.cost,
            updateTime: boost.updateTime,
            duration: boost.duration,
          },
          (response) => {
            if (!response.success) {
              showBoostPurchaseError(response.message);
            } else {
              showBoostPurchaseSuccess(boost.name);
            }
          }
        );
      });
    } else {
      socket.emit(
        'purchase-boost',
        {
          boostName: boost.name,
          cost: boost.cost,
          updateTime: boost.updateTime,
          duration: boost.duration,
        },
        (response) => {
          if (!response.success) {
            showBoostPurchaseError(response.message);
          } else {
            showBoostPurchaseSuccess(boost.name);
          }
        }
      );
    }
  };

  return (
    <>
      <h3 className="Menu__logo">Shop</h3>
      <div className="coins-display">
        Coins: <span style={{ color: '#31c400ff'}}>{coins}</span>
      </div>
      {isState === 0 ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <button onClick={() => setIsState(1)}>Бусты</button>
            <button onClick={() => setIsState(2)}>Новый цвет</button>
            <button onClick={() => setIsState(3)}>Монеты $</button>
          </div>
        </>
      ) : isState === 1 ? (
        <>
          <Boosts
            boosts={boosts}
            activeBoost={activeBoost}
            handlePurchase={handlePurchase}
            setIsState={setIsState}
          />
        </>
      ) : isState === 2 ? (
        <>
          <Color setIsState={setIsState} coins={coins} socket={socket} />
        </>
      ) : isState === 3 ? (
        <>
          <Coins setIsState={setIsState} socket={socket} />
        </>
      ) : null}
      <div className="menu__switch__buttons">
        <button onClick={onBack}>Назад</button>
      </div>
    </>
  );
};

export default Shop;

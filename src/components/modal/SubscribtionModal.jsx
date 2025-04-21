import React from 'react';
import PropTypes from 'prop-types';
import { playSound } from '../../utils/functions/sounds/sounds';
import { useSettings } from '../../hooks/useSettings';

export const SubscribtionModal = ({
  isOpenSubscription,
  setIsOpenSubscription,
  DBmaxPixelCount,
  socket,
  doPayment,
}) => {
  const { isHudOpen, isSoundsOn } = useSettings();

  if (!isOpenSubscription) return null;

  if (!socket) {
    return null;
  }

  const subscriptionOptions = [
    { cost: 99, limit: 200, text: 'Увеличение лимита до 200PX' },
    { cost: 179, limit: 300, text: 'Увеличение лимита до 300PX' },
    { cost: 259, limit: 400, text: 'Увеличение лимита до 400PX' },
  ];

  const backSubscriptionModalSound = (state) => {
    if (state === true) {
      playSound(0.5, 'to.mp3', isSoundsOn);
    } else {
      playSound(0.5, 'out.mp3', isSoundsOn);
    }
    setIsOpenSubscription(state);
  };

  const paymentButtonSound = (cost, limit, socket) => {
    playSound(0.5, 'note-4.mp3', isSoundsOn);
    doPayment(cost, limit, socket);
  };

  return (
    <div className="SubscriptionModal__Content">
      {subscriptionOptions.map(
        ({ cost, limit, text }) =>
          DBmaxPixelCount < limit && (
            <button
              key={limit}
              onClick={() => paymentButtonSound(cost, limit, socket)}
              className="server_button"
            >
              <p className="Subscription__cost">Оформить подписку за {cost}₽</p>
              <p className="Subscription__info">{text}</p>
            </button>
          )
      )}
      <button
        onClick={() => backSubscriptionModalSound(false)}
        className="server_button"
      >
        Отмена
      </button>
    </div>
  );
};

SubscribtionModal.propTypes = {
  isOpenSubscription: PropTypes.bool.isRequired,
  setIsOpenSubscription: PropTypes.func.isRequired,
  DBmaxPixelCount: PropTypes.number.isRequired,
  socket: PropTypes.object.isRequired,
  doPayment: PropTypes.func.isRequired,
};

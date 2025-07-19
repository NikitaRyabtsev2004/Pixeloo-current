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
  showDonationAlert,
  showDonationMakeError,
  showDonationSuccess,
  showDonationError,
  inputColor,
}) => {
  const { isSoundsOn } = useSettings();

  if (!isOpenSubscription) return null;

  if (!socket) {
    return null;
  }

  const subscriptionOptions = [
    {
      cost: 199,
      limit: 200,
      text: 'Увеличение лимита до 200PX',
      upgrade: false,
    },
    {
      cost: DBmaxPixelCount === 200 ? 209 : 389,
      limit: 300,
      text: 'Увеличение лимита до 300PX',
      upgrade: DBmaxPixelCount === 200,
    },
    {
      cost: DBmaxPixelCount === 300 ? 219 : DBmaxPixelCount === 200 ? 399 : 579,
      limit: 400,
      text: 'Увеличение лимита до 400PX',
      upgrade: DBmaxPixelCount === 200 || DBmaxPixelCount === 300,
    },
    {
      cost: 1599,
      limit: null,
      text: 'Color Selector (выбор любого цвета)',
      isColorSubscription: true,
    },
  ];

  const backSubscriptionModalSound = (state) => {
    if (state === true) {
      playSound(0.5, 'to.mp3', isSoundsOn);
    } else {
      playSound(0.5, 'out.mp3', isSoundsOn);
    }
    setIsOpenSubscription(state);
  };

  const paymentButtonSound = (cost, limit, isColorSubscription = false) => {
    playSound(0.5, 'note-4.mp3', isSoundsOn);
    doPayment(
      cost,
      limit,
      socket,
      showDonationAlert,
      showDonationMakeError,
      showDonationSuccess,
      showDonationError,
      isColorSubscription
    );
  };

  return (
    <div className="SubscriptionModal__Content">
      {subscriptionOptions
        .filter(
          ({ limit, isColorSubscription }) =>
            (limit === null || DBmaxPixelCount < limit) && !(isColorSubscription && inputColor)
        )
        .map(({ cost, limit, text, isColorSubscription }) => (
          <button
            key={limit || 'colorSelector'}
            onClick={() =>
              paymentButtonSound(cost, limit, isColorSubscription)
            }
            className="server_button"
          >
            <p className="Subscription__cost">Оформить подписку за {cost}₽</p>
            <p className="Subscription__info">{text}</p>
          </button>
        ))}
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
  showDonationAlert: PropTypes.func.isRequired,
  showDonationMakeError: PropTypes.func.isRequired,
  showDonationSuccess: PropTypes.func.isRequired,
  showDonationError: PropTypes.func.isRequired,
  inputColor: PropTypes.bool.isRequired,
};
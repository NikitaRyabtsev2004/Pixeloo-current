import React from 'react';
import PropTypes from 'prop-types';
import { playSound } from '../../utils/functions/sounds/sounds';
import { useSettings } from '../../hooks/useSettings';

export const UserSubscription = ({
  isAuthenticated,
  isSubscribed,
  pixelCount,
  DBmaxPixelCount,
  setIsOpenSubscription,
}) => {
  const { isSoundsOn } = useSettings();
  if (!isAuthenticated) return null;

  const setIsOpenSubscriptionButtonSound = (state) => {
    if (state === true) {
      playSound(0.5, 'to.mp3', isSoundsOn);
    } else {
      playSound(0.5, 'out.mp3', isSoundsOn);
    }
    setIsOpenSubscription(state);
  };

  return (
    <>
      {isSubscribed || pixelCount > 100 ? (
        <>
          {DBmaxPixelCount < 400 && (
            <>
              <div className="isSubcribed">Вы подписаны</div>
              <button onClick={() => setIsOpenSubscriptionButtonSound(true)}>
                Увеличить подписку
              </button>
            </>
          )}
          {DBmaxPixelCount === 400 && (
            <div className="isSubcribed">Максимальная подписка</div>
          )}
        </>
      ) : (
        <button
          className="server_button sub"
          style={{ background: 'lightgray' }}
          onClick={() => setIsOpenSubscriptionButtonSound(true)}
        >
          Оформить подписку
        </button>
      )}
    </>
  );
};

UserSubscription.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired,
  isSubscribed: PropTypes.bool.isRequired,
  pixelCount: PropTypes.number.isRequired,
  DBmaxPixelCount: PropTypes.number.isRequired,
  setIsOpenSubscription: PropTypes.func.isRequired,
};

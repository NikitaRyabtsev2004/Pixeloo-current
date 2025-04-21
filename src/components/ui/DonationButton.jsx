import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { playSound } from '../../utils/functions/sounds/sounds';
import { useSettings } from '../../hooks/useSettings';

export const DonationButton = ({
  amount,
  isOpen,
  setAmount,
  setIsOpen,
  handleDoPayment,
  isAuthenticated,
}) => {
  const style = {
    top: isAuthenticated ? '110px' : '10px',
  };
  const { isHudOpen, isSoundsOn } = useSettings();

  const donationButtonSound = (prevState) => {
    if (isOpen === false) {
      playSound(0.5, 'to.mp3', isSoundsOn);
    } else {
      playSound(0.5, 'out.mp3', isSoundsOn);
    }
    setIsOpen((prevState) => !prevState);
  };

  const handleDoPaymentButtonSound = (amount) => {
    playSound(0.5, 'note-4.mp3', isSoundsOn);
    handleDoPayment(parseFloat(amount));
  };

  return (
    <>
      {isHudOpen ? (
        <>
          <div className="donation_content" style={style}>
            {isOpen ? (
              <div>
                <input
                  type="number"
                  placeholder="Введите сумму"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <button
                  onClick={() => handleDoPaymentButtonSound(amount)}
                  className="server_button"
                >
                  Пожертвовать
                </button>
                <button
                  onClick={() => donationButtonSound(false)}
                  className="server_button"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <div>
                <button
                  className="server_button"
                  onClick={() => donationButtonSound(true)}
                >
                  Поддержать проект
                </button>
              </div>
            )}
          </div>
        </>
      ) : null}
    </>
  );
};

DonationButton.propTypes = {
  amount: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  setAmount: PropTypes.func.isRequired,
  setIsOpen: PropTypes.func.isRequired,
  handleDoPayment: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.bool.isRequired,
};

import React, { useState } from 'react';

const NotificationModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      {isOpen ? (
        <div className="NotificationModal__container">
          <div className="NotificationModal">
            <div className="NotificationModal__logo">Уведомление</div>

            <div className="NotificationModal__content">
              <div className="NotificationModal__photo">
                <img src="/gear.gif" alt="Фото" />
              </div>

              <div className="NotificationModal__info">
                <div className="NotificationModal__photo__text">
                  <div>Случай:</div>
                  <div>Технические работы</div>
                </div>
                <div className="NotificationModal__timer">
                  <div>Время:</div>
                  <div>hh:mm-hh:mm</div>
                </div>
              </div>
            </div>
            <div className="NotificationModal__text">
              <div>Сообщение:</div>
              <div>Проведение технических работ с hh:mm по hh:mm</div>
              <div>Инциденты по этому времени не принимаются</div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="modal__close-button notification"
            >
              Закрыть
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default NotificationModal;

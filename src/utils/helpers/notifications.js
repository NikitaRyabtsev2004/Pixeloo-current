import Swal from 'sweetalert2';
import { playSound } from '../functions/sounds/sounds';
import { useSettings } from '../../hooks/useSettings';

export default function useNotifications() {
  const { isSoundsOn } = useSettings();

  const showNotification = (title, text, icon) => {
    Swal.fire({
      title,
      text,
      icon,
      customClass: {
        title: 'swal2-title',
        popup: 'swal2-popup',
        confirmButton: 'swal2-confirm',
      },
      timer: 10000,
      timerProgressBar: true,
      background: 'white',
      willOpen: () => {
        const popup = Swal.getPopup();
        if (popup) {
          popup.style.fontFamily = "'Pixelify Sans', sans-serif";
          popup.style.borderRadius = '0px';
          popup.style.zIndex = '9999';
          const titleEl = popup.querySelector('.swal2-title');
          const contentEl = popup.querySelector('.swal2-content');
          const confirmButton = popup.querySelector('.swal2-confirm');

          if (titleEl) titleEl.style.fontFamily = "'Pixelify Sans', sans-serif";
          if (contentEl) contentEl.style.fontFamily = "'Pixelify Sans', sans-serif";
          if (confirmButton) {
            confirmButton.style.fontFamily = "'Pixelify Sans', sans-serif";
            confirmButton.style.borderRadius = '0px';
          }
        }
      },
      preConfirm: () => {
        playSound(0.5, 'note-3.mp3', isSoundsOn);
      },
    });
  };

  return {
    showDisconnectedNotification: () => 
      showNotification('Отключено или переподключение', 'Соединение с сервером потеряно, или переподключение на другой сервер.', 'warning'),

    showAuthenticationRequiredNotification: () => {
      playSound(0.5, 'error-message.mp3', isSoundsOn);
      showNotification(
        'Требуется авторизация!',
        'Вам нужно войти в систему, чтобы размещать пиксели. Если вы уже вошли, пожалуйста, авторизуйтесь повторно.',
        'info'
      );
    },

    showConnectionRestoredNotification: () =>
      showNotification('Соединение восстановлено!', 'Соединение с сервером успешно восстановлено.', 'success'),

    showOutOfPixelsNotification: () => {
      playSound(0.5, 'error-message.mp3', isSoundsOn);
      showNotification('Закончились пиксели!', 'Подождите, ваш баланс равен нулю.', 'warning');
    },

    showDonationAlert: () => {
      playSound(0.5, 'error-message.mp3', isSoundsOn);
      showNotification('Введите корректную сумму для оплаты.', 'Сумма должна быть больше 0р', 'warning');
    },

    showDonationSuccess: () => 
      showNotification('Успешная оплата', 'Оплата прошла успешно!', 'success'),

    showDonationError: () => {
      playSound(0.5, 'error-message.mp3', isSoundsOn);
      showNotification(
        'Оплата не удалась. Попробуйте снова.',
        'При попытке оплаты произошла ошибка, попробуйте снова, если оплата прошла обратитесь в поддержку.',
        'error'
      );
    },

    showDonationMakeError: () => {
      playSound(0.5, 'error-message.mp3', isSoundsOn);
      showNotification(
        'Ошибка при создании платежа.',
        'Ошибка при создании платежа. Попробуйте снова или через минуту.',
        'error'
      );
    },
  };
}

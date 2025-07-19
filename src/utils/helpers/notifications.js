import Swal from 'sweetalert2';
import { playSound } from '../functions/sounds/sounds';
import { useSettings } from '../../hooks/useSettings';

export function useNotifications() {
  const { isSoundsOn } = useSettings();

  const showNotification = (title, text, icon, options = {}) => {
    Swal.fire({
      title,
      text,
      icon,
      customClass: {
        title: 'swal2-title',
        popup: 'swal2-popup',
        confirmButton: 'swal2-confirm',
        cancelButton: 'swal2-cancel',
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
          const cancelButton = popup.querySelector('.swal2-cancel');

          if (titleEl) titleEl.style.fontFamily = "'Pixelify Sans', sans-serif";
          if (contentEl)
            contentEl.style.fontFamily = "'Pixelify Sans', sans-serif";
          if (confirmButton) {
            confirmButton.style.fontFamily = "'Pixelify Sans', sans-serif";
            confirmButton.style.borderRadius = '0px';
          }
          if (cancelButton) {
            cancelButton.style.fontFamily = "'Pixelify Sans', sans-serif";
            cancelButton.style.borderRadius = '0px';
          }
        }
      },
      preConfirm: () => {
        playSound(0.5, 'note-3.mp3', isSoundsOn);
      },
      ...options,
    });
  };

  return {
    showDisconnectedNotification: () =>
      showNotification(
        'Предупреждение',
        'Переподключение на другой сервер, изменение настроек, или потеряно соединение с сервером.',
        'warning'
      ),

    showAuthenticationRequiredNotification: () => {
      playSound(0.5, 'error-message.mp3', isSoundsOn);
      showNotification(
        'Требуется авторизация!',
        'Вам нужно войти в систему, чтобы размещать пиксели. Если вы уже вошли, пожалуйста, авторизуйтесь повторно.',
        'info'
      );
    },

    showConnectionRestoredNotification: () =>
      showNotification(
        'Соединение восстановлено!',
        'Соединение с сервером успешно восстановлено.',
        'success'
      ),

    showOutOfPixelsNotification: () => {
      playSound(0.5, 'error-message.mp3', isSoundsOn);
      showNotification(
        'Закончились пиксели!',
        'Подождите, ваш баланс равен нулю.',
        'warning'
      );
    },

    showDonationAlert: () => {
      playSound(0.5, 'error-message.mp3', isSoundsOn);
      showNotification(
        'Введите корректную сумму для оплаты.',
        'Сумма должна быть больше 0р',
        'warning'
      );
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

    showRevardsError: (message = 'Не удалось получить награду.') => {
      playSound(0.5, 'error-message.mp3', isSoundsOn);
      showNotification('Ошибка получения награды', message, 'error');
    },

    showDonationMakeError: () => {
      playSound(0.5, 'error-message.mp3', isSoundsOn);
      showNotification(
        'Ошибка при создании платежа.',
        'Ошибка при создании платежа. Попробуйте снова или через минуту.',
        'error'
      );
    },

    showUndoPixelSuccess: () => {
      playSound(0.5, 'success.mp3', isSoundsOn);
      showNotification(
        'Удалено',
        'Последний пиксель успешно удалён!',
        'success'
      );
    },

    showUndoPixelError: (message) => {
      playSound(0.5, 'error-message.mp3', isSoundsOn);
      showNotification(
        'Ошибка удаления',
        'Пиксель не оставлен, уже удален, или изменен другим игроком. Удалять можно только последний оставленный пиксель.',
        'error'
      );
    },

    showAchievementRewardSuccess: (coins, achievementName) => {
      playSound(0.5, 'success.mp3', isSoundsOn);
      showNotification(
        'Награда получена!',
        `Вы получили ${coins} монет за достижение "${achievementName}"!`,
        'success'
      );
    },

    showDailyRewardSuccess: (coins, rewardName) => {
      playSound(0.5, 'success.mp3', isSoundsOn);
      showNotification(
        'Награда получена!',
        `Вы получили ${coins} монет за ежедневную награду "${rewardName}"!`,
        'success'
      );
    },

    showInsufficientCoinsNotification: () => {
      playSound(0.5, 'error-message.mp3', isSoundsOn);
      showNotification(
        'Недостаточно монет!',
        'У вас недостаточно монет для покупки.',
        'error'
      );
    },

    showBoostPurchaseError: (message = 'Ошибка при покупке буста.') => {
      playSound(0.5, 'error-message.mp3', isSoundsOn);
      showNotification('Ошибка покупки буста', message, 'error');
    },

    showBoostPurchaseSuccess: (boostName) => {
      playSound(0.5, 'success.mp3', isSoundsOn);
      showNotification(
        'Буст приобретен!',
        `Вы успешно приобрели буст "${boostName}"!`,
        'success'
      );
    },

    showBoostReplaceConfirmation: (boostName, onConfirm) => {
      showNotification(
        'Подтверждение покупки',
        `Вы точно уверены, что хотите приобрести "${boostName}"? Это отменит уже имеющийся буст.`,
        'warning',
        {
          showCancelButton: true,
          confirmButtonText: 'Да, приобрести',
          cancelButtonText: 'Отмена',
          preConfirm: () => {
            playSound(0.5, 'note-3.mp3', isSoundsOn);
            onConfirm();
          },
        }
      );
    },

    showColorPurchaseSuccess: (color) => {
      playSound(0.5, 'success.mp3', isSoundsOn);
      showNotification(
        'Цвет приобретен!',
        `Вы успешно приобрели цвет "${color}"!`,
        'success'
      );
    },

    showColorPurchaseError: (message = 'Ошибка при покупке цвета.') => {
      playSound(0.5, 'error-message.mp3', isSoundsOn);
      showNotification('Ошибка покупки цвета', message, 'error');
    },

    showColorPurchaseConfirmation: (color, onConfirm) => {
      showNotification(
        'Подтверждение покупки',
        `Вы уверены, что хотите купить цвет ${color} за 200 монет?`,
        'question',
        {
          showCancelButton: true,
          confirmButtonText: 'Купить',
          cancelButtonText: 'Отмена',
          preConfirm: () => {
            playSound(0.5, 'note-3.mp3', isSoundsOn);
            onConfirm();
          },
        }
      );
    },
  };
}

import React from 'react';
import PropTypes from 'prop-types';
import { useNotifications } from '../../utils/helpers/notifications';

const UndoButton = ({ socket, isAuthenticated }) => {
  const { showUndoPixelSuccess, showUndoPixelError } = useNotifications();

  const handleUndoClick = () => {
    if (!isAuthenticated) {
      showUndoPixelError('Требуется авторизация для отмены пикселя');
      return;
    }

    socket.emit('undo-last-pixel', (response) => {
      if (response && response.success) {
        showUndoPixelSuccess('Последний пиксель успешно отменён');
      } else {
        showUndoPixelError(response?.message || 'Ошибка при отмене пикселя');
      }
    });
  };

  return (
    <button
      onClick={handleUndoClick}
      className="undo-button"
      disabled={!isAuthenticated}
    >
      Отменить последний пиксель
    </button>
  );
};

UndoButton.propTypes = {
  socket: PropTypes.object.isRequired,
  isAuthenticated: PropTypes.bool.isRequired,
};

export default UndoButton;
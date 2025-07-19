import React from 'react';
import PropTypes from 'prop-types';

export const ControlPanel = ({
  isVisible,
  onIncreaseScale,
  onDecreaseScale,
  onMoveUp,
  onMoveLeft,
  onMoveDown,
  onMoveRight,
  isAuthenticated,
}) => {
  if (!isVisible) return null;
  return (
    <div
      className={`control-buttons ${isAuthenticated ? '' : 'nonAuth'}`}
    >
      <button className="zoom-button plus" onClick={onIncreaseScale}>
        +
      </button>
      <button className="move-arrow up-arrow" onClick={onMoveUp}>
        ↑
      </button>
      <button className="zoom-button minus" onClick={onDecreaseScale}>
        -
      </button>
      <button className="move-arrow left-arrow" onClick={onMoveLeft}>
        ←
      </button>
      <button className="move-arrow down-arrow" onClick={onMoveDown}>
        ↓
      </button>
      <button className="move-arrow right-arrow" onClick={onMoveRight}>
        →
      </button>
    </div>
  );
};

ControlPanel.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onIncreaseScale: PropTypes.func.isRequired,
  onDecreaseScale: PropTypes.func.isRequired,
  onMoveUp: PropTypes.func.isRequired,
  onMoveLeft: PropTypes.func.isRequired,
  onMoveDown: PropTypes.func.isRequired,
  onMoveRight: PropTypes.func.isRequired,
};

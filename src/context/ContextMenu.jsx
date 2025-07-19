import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ColorPalette } from '../components/ui/ColorPalette';
import { useSettings } from '../hooks/useSettings';
import { playSound } from '../utils/functions/sounds/sounds';
import UndoButton from '../components/ui/UndoButton';

const ContextMenu = ({
  position,
  onClose,
  isAuthenticated,
  selectedColor,
  setSelectedColor,
  socket,
  inputColor,
  userColors,
}) => {
  const menuWidth = 150;
  const menuHeight = 220;

  const maxX = window.innerWidth - menuWidth - 5;
  const maxY = window.innerHeight - menuHeight - 5;
  const adjustedX = Math.min(position.x, maxX);
  const adjustedY = Math.min(position.y, maxY);

  const [isChecked, setIsChecked] = useState(() => {
    return localStorage.getItem('HUD') === 'true';
  });
  const { isSoundsOn } = useSettings();

  const handleCheckboxClick = () => {
    setIsChecked((prev) => {
      playSound(0.5, 'note-3.mp3', isSoundsOn);
      const newValue = !prev;
      localStorage.setItem('HUD', newValue.toString());
      window.dispatchEvent(new Event('storage'));
      return newValue;
    });
  };

  if (!isAuthenticated) {
    return;
  }

  return (
    <div
      className="Context_menu-container"
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
        width: `${menuWidth}px`,
        height: `${menuHeight}px`,
      }}
    >
      <div className="Context_menu">
        <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>
          Быстрый выбор
        </div>
        {/*------цвета------*/}
        <div style={{ textAlign: 'start', marginLeft: '15px' }}>Цвета:</div>
        <ColorPalette
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          inputColor={inputColor}
          userColors={userColors}
        />
        {/*------худ------*/}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
          }}
        >
          <div>HUD</div>
          <div>
            <button
              onClick={handleCheckboxClick}
              style={{
                backgroundColor: isChecked ? '#e0f7fa' : '#fff',
              }}
            >
              <span>{isChecked ? '✓' : ''}</span>
              <span>HUD</span>
            </button>
          </div>
        </div>
        {/*------отмена------*/}
        <UndoButton socket={socket} isAuthenticated={isAuthenticated} />
      </div>
      <div className="Context_menu-close_button" onClick={onClose}>
        х
      </div>
    </div>
  );
};

ContextMenu.propTypes = {
  position: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ContextMenu;

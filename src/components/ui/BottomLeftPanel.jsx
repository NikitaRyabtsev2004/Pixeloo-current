import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toggleControlPanel } from '../../redux/slices/uiSlice';
import { ColorPalette } from './ColorPalette.jsx';
import PropTypes from 'prop-types';
import { ControlPanel } from './ControlPanel.jsx';
import LeaderBoard from './ui_components/LeaderBoard.jsx';
import Menu from './ui_components/Menu/Menu.jsx';
import { to } from './ui_components/buttons/MenuButton.jsx';
import { useSettings } from '../../hooks/useSettings.js';
import ImageUploader from './ui_components/buttons/ImageUploader.jsx';
import ImageModal from '../modal/ImageModal.jsx';

export const ColorSelector = ({
  isAuthenticated,
  showControlPanel,
  selectedColor,
  setSelectedColor,
  recentColors,
  handleIncreaseScale,
  handleDecreaseScale,
  handleMoveUp,
  handleMoveLeft,
  handleMoveDown,
  handleMoveRight,
  socket,
  handleImageUpload,
  closeModal,
  isModalOpen,
  imageUrl,
}) => {
  const dispatch = useDispatch();
  const [isState, setState] = useState(1);
  const { isHudOpen, isSoundsOn } = useSettings();
  const [isHudOpacity, setIsHudOpacity] = useState(() => {
    const savedValue = localStorage.getItem('HUDOpacity');
    return savedValue !== null ? parseInt(savedValue, 10) : 50;
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.isContentEditable
      ) {
        return;
      }

      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          handleMoveUp();
          break;
        case 'ArrowDown':
        case 'KeyS':
          handleMoveDown();
          break;
        case 'ArrowLeft':
        case 'KeyA':
          handleMoveLeft();
          break;
        case 'ArrowRight':
        case 'KeyD':
          handleMoveRight();
          break;
        case 'KeyE':
          handleDecreaseScale();
          break;
        case 'KeyQ':
          handleIncreaseScale();
          break;
        default:
          break;
      }
    };

    const handleWheel = (event) => {
      if (event.target.closest('.bottom-left-panel___container')) {
        return;
      }
      if (event.deltaY < 0) {
        handleIncreaseScale();
      } else {
        handleDecreaseScale();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [
    handleMoveUp,
    handleMoveDown,
    handleMoveLeft,
    handleMoveRight,
    handleIncreaseScale,
    handleDecreaseScale,
  ]);

  useEffect(() => {
    const handleStorageChange = () => {
      const updatedValue = localStorage.getItem('HUDOpacity');
      if (updatedValue !== null) {
        setIsHudOpacity(parseInt(updatedValue, 10));
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('HUDOpacity', isHudOpacity.toString());
  }, [isHudOpacity]);

  return (
    isAuthenticated && (
      <div
        style={{ opacity: isHudOpen ? 1 : isHudOpacity / 100 }}
        className="bottom-left-panel___container"
      >
        {isState === 1 ? (
          <>
            <button
              className="toggle__control__panel"
              onClick={() => dispatch(toggleControlPanel({ isSoundsOn }))}
            >
              {showControlPanel ? 'Скрыть панель' : 'Показать панель'}
            </button>

            <ControlPanel
              isVisible={showControlPanel}
              onIncreaseScale={handleIncreaseScale}
              onDecreaseScale={handleDecreaseScale}
              onMoveUp={handleMoveUp}
              onMoveLeft={handleMoveLeft}
              onMoveDown={handleMoveDown}
              onMoveRight={handleMoveRight}
            />

            <div>
              <ImageUploader onImageUpload={handleImageUpload} />
              {isModalOpen && (
                <ImageModal imageUrl={imageUrl} onClose={closeModal} />
              )}
            </div>

            <ColorPalette
              selectedColor={selectedColor}
              setSelectedColor={setSelectedColor}
            />

            <h3>Ваш цвет: {selectedColor}</h3>
            <h3>Недавние цвета:</h3>

            <div className="recent__colors__container">
              <div className="recent__colors">
                {recentColors.map((color, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedColor(color)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedColor(color);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="recent__color"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </>
        ) : isState === 2 ? (
          <>
            <LeaderBoard socket={socket} />
          </>
        ) : (
          <>
            <Menu socket={socket} />
          </>
        )}
        <div className="bottom-left-panel___buttons-container">
          <button onClick={() => to(setState, 1, isSoundsOn)}>Палитра</button>
          <button onClick={() => to(setState, 2, isSoundsOn)}>Лидеры</button>
          <button onClick={() => to(setState, 3, isSoundsOn)}>Меню</button>
        </div>
      </div>
    )
  );
};

ColorSelector.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired,
  showControlPanel: PropTypes.bool.isRequired,
  selectedColor: PropTypes.string.isRequired,
  setSelectedColor: PropTypes.func.isRequired,
  recentColors: PropTypes.arrayOf(PropTypes.string).isRequired,
  handleIncreaseScale: PropTypes.func.isRequired,
  handleDecreaseScale: PropTypes.func.isRequired,
  handleMoveUp: PropTypes.func.isRequired,
  handleMoveLeft: PropTypes.func.isRequired,
  handleMoveDown: PropTypes.func.isRequired,
  handleMoveRight: PropTypes.func.isRequired,
  socket: PropTypes.object.isRequired,
};
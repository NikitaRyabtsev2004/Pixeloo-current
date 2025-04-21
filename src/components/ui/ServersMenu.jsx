import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { playSound } from '../../utils/functions/sounds/sounds';
import { useSettings } from '../../hooks/useSettings';
import BattleMenuModal from '../modal/BattleMenuModal';

const CanvasSwitcher = ({ path }) => {
  const navigate = useNavigate();

  const getButtonLabel = () => {
    switch (path) {
      case '/canvas-1':
        return 'Сервер-1';
      case '/canvas-2':
        return 'Сервер-2';
      case '/canvas-3':
        return 'Сервер-3';
      case '/single-player-game':
        return 'Одиночная игра';
      default:
        return null;
    }
  };

  const getButtonClass = () => {
    return path === '/single-player'
      ? 'server_button single_player_button'
      : 'server_button';
  };

  return (
    <button className={getButtonClass()} onClick={() => navigate(path)}>
      {getButtonLabel()}
    </button>
  );
};

CanvasSwitcher.propTypes = {
  path: PropTypes.string.isRequired,
};

const ServersMenu = ({socket}) => {
  const [showServersModal, setShowServersModal] = useState(false);
  const { isHudOpen, isSoundsOn } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const serversSoundButton = (prevState) => {
    if (showServersModal === false) {
      playSound(0.5, 'to.mp3', isSoundsOn);
    } else {
      playSound(0.5, 'out.mp3', isSoundsOn);
    }

    setShowServersModal((prevState) => !prevState);
  };

  return (
    <>
      {isHudOpen && (
        <>
          <div
            className="servers"
            onClick={() => serversSoundButton(showServersModal)}
          >
            Режим игры
            {showServersModal && (
              <div className="servers__list">
                <CanvasSwitcher path="/canvas-1" />
                <CanvasSwitcher path="/canvas-2" />
                <CanvasSwitcher path="/canvas-3" />
                <CanvasSwitcher path="/single-player-game" />
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="server_button"
                >
                  Battle
                </button>
                {/* <CanvasSwitcher path="/ai" /> */}
              </div>
            )}
          </div>
          {isMenuOpen && (
            <BattleMenuModal onClose={() => setIsMenuOpen(false)} socket={socket} />
          )}
        </>
      )}
    </>
  );
};

export default ServersMenu;

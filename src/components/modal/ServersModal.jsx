import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { playSound } from '../../utils/functions/sounds/sounds';
import { useSettings } from '../../hooks/useSettings';
import BattleMenuModal from './BattleMenuModal';
import CanvasPreview from '../ui/ui_components/CanvasPreview';
import '../../styles/ServersMenu.css';

const CanvasSwitcher = ({ path, label, isSoundsOn, socket, setShowServersModal }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    playSound(0.5, 'to.mp3', isSoundsOn);
    if (socket) {
      socket.disconnect();
    }
    navigate(path);
    setShowServersModal(false);
  };

  return (
    <button className="server_button" onClick={handleClick}>
      {label}
    </button>
  );
};

CanvasSwitcher.propTypes = {
  path: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  isSoundsOn: PropTypes.bool.isRequired,
  socket: PropTypes.object.isRequired,
  setShowServersModal: PropTypes.func.isRequired,
};

const ServersMenu = ({ socket, isAuthenticated }) => {
  const [showServersModal, setShowServersModal] = useState(false);
  const { isHudOpen, isSoundsOn } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const serversSoundButton = () => {
    if (!showServersModal) {
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
          <div className="servers server_button" onClick={serversSoundButton}>
            Режим игры
          </div>
          {showServersModal && (
            <div className="servers-modal-overlay">
              <div className="servers-modal">
                <h2 className="servers-modal-title">Select Game Mode</h2>
                <div className="servers-modal-content">
                  <CanvasPreview
                    socket={socket}
                    serverNumber="1"
                    path="/canvas-1"
                    showModal={showServersModal}
                    setShowServersModal={setShowServersModal}
                  />
                  <CanvasPreview
                    socket={socket}
                    serverNumber="2"
                    path="/canvas-2"
                    showModal={showServersModal}
                    setShowServersModal={setShowServersModal}
                  />
                  <CanvasPreview
                    socket={socket}
                    serverNumber="3"
                    path="/canvas-3"
                    showModal={showServersModal}
                    setShowServersModal={setShowServersModal}
                  />
                  {isAuthenticated && (
                    <CanvasSwitcher
                      path="/single-player-game"
                      label="Одиночная игра"
                      isSoundsOn={isSoundsOn}
                      socket={socket}
                      setShowServersModal={setShowServersModal}
                    />
                  )}

                  {/* <button
                    className="server_button battle-button"
                    onClick={() => {
                      playSound(0.5, 'to.mp3', isSoundsOn);
                      setIsMenuOpen(!isMenuOpen);
                    }}
                  >
                    Battle
                  </button> */}
                </div>
                <button
                  className="servers-modal-close"
                  onClick={serversSoundButton}
                >
                  Close
                </button>
              </div>
            </div>
          )}
          {isMenuOpen && (
            <BattleMenuModal
              onClose={() => setIsMenuOpen(false)}
              socket={socket}
            />
          )}
        </>
      )}
    </>
  );
};

ServersMenu.propTypes = {
  socket: PropTypes.object.isRequired,
};

export default ServersMenu;

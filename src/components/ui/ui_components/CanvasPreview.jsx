import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { playSound } from '../../../utils/functions/sounds/sounds';
import { useSettings } from '../../../hooks/useSettings';
import config from '../../../utils/config/config';

const CanvasPreview = ({ socket, serverNumber, path, showModal, setShowServersModal }) => {
  const navigate = useNavigate();
  const { isSoundsOn } = useSettings();
  const [imageSrc, setImageSrc] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (showModal) {
      fetch(`${config.serverUrl_1}/api/images/server-${serverNumber}/url`, {
        method: 'GET',
        credentials: 'include',
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to fetch image URL: ${res.statusText}`);
          return res.json();
        })
        .then((data) => {
          if (data.success) {
            setImageSrc(data.imageUrl);
            setError(null);
          } else {
            throw new Error(data.message);
          }
        })
        .catch((err) => {
          console.error('Error fetching canvas image URL:', err.message);
          setError(err.message);
        });
    }
  }, [showModal, serverNumber]);

  const handleClick = () => {
    playSound(0.5, 'to.mp3', isSoundsOn);
    // Disconnect current socket before navigating
    if (socket) {
      socket.disconnect();
    }
    navigate(path);
    setShowServersModal(false)
  };

  return (
    <div
      className="canvas-preview"
      onClick={handleClick}
    >
      <h3>Server {serverNumber}</h3>
      {imageSrc && !error ? (
        <img
          src={`${config.serverUrl_1}${imageSrc}`}
          alt={`Canvas ${serverNumber} Preview`}
        />
      ) : (
        <div
          style={{
            width: '200px',
            height: '200px',
            background: '#555',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            borderRadius: '5px',
          }}
        >
          {error ? `Error: ${error}` : 'Loading...'}
        </div>
      )}
    </div>
  );
};

CanvasPreview.propTypes = {
  socket: PropTypes.object.isRequired,
  serverNumber: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  showModal: PropTypes.bool.isRequired,
};

export default CanvasPreview;
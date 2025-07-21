import React, { useEffect, useState, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useNotifications } from '../../utils/helpers/notifications';
import PropTypes from 'prop-types';
import { PIXEL_SIZE } from '../../utils/config/canvas-size';
import config from '../../utils/config/config';
import { addRecentColor } from '../../redux/slices/recentColorsSlice';
import { ServerStatus } from '../ui/ServerStatus.jsx';
import { DonationButton } from '../ui/DonationButton.jsx';
import { SubscribtionModal } from '../modal/SubscribtionModal.jsx';
import { doPayment } from '../../utils/functions/payment/handlePayment';
import { ColorSelector } from '../ui/BottomLeftPanel.jsx';
import { UserSubscription } from '../ui/UserSubscribtion.jsx';
import CoordinateHint from '../ui/CoordinateHint.jsx';
import { PixelStatus } from '../ui/PixelStatus.jsx';
import {
  drawCanvas,
  moveDown,
  moveLeft,
  moveRight,
  moveUp,
  increaseScale,
  decreaseScale,
  drawPixel,
  getVisibleChunks,
  updateChunks,
} from '../../utils/functions/canvas/canvasHelpers';
import {
  handleCanvasClick,
  handleMouseDown,
  handleMouseUp,
} from '../../utils/functions/mouse/canvasMouseEvents';
import { handlePixelClick } from '../../utils/functions/canvas/canvasInteraction';
import { useSettings } from '../../hooks/useSettings.js';
import AchievementShow from '../ui/ui_components/Achievements/AchievementShow.jsx';
import { useAchievements } from '../../hooks/useAchievements.js';
import ServersMenu from '../modal/ServersModal.jsx';
import { useCanvasSize } from '../../hooks/useCanvasSize.js';
import { API_URL } from '../../utils/helpers/constants';
import { logout } from '../../redux/slices/authSlice.js';
import ContextMenu from '../../context/ContextMenu.jsx';
import Chat from '../ui/Chat.jsx';

const Canvas = ({ isAuthenticated }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isSoundsOn } = useSettings();
  const serverNumber =
    location.pathname === '/single-player-game'
      ? 'single'
      : location.pathname.split('-')[1] || '1';
  let dirtyPixels = [];
  const [pixels, setPixels] = useState([]);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [userCount, setUserCount] = useState({
    totalUsers: 0,
    totalConnections: 0,
  });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canDraw, setCanDraw] = useState(true);
  const [remainingTime, setRemainingTime] = useState(0);
  const [pixelCount, setPixelCount] = useState(0);
  const [hasNoMorePixels, setHasNoMorePixels] = useState(false);
  const [status, setStatus] = useState('connecting');
  const [lastCheckTime, setLastCheckTime] = useState(Date.now());
  const [maxPixelCount, setMaxPixelCount] = useState();
  const [DBmaxPixelCount, DBsetMaxPixelCount] = useState(100);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [amount, setAmount] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenSubscription, setIsOpenSubscription] = useState(false);
  const [hoveredCoordinates, setHoveredCoordinates] = useState({
    x: null,
    y: null,
  });
  const [hoveredUsername, setHoveredUsername] = useState(null);
  const [hoveredPixelColor, setHoveredPixelColor] = useState(null);
  const recentColors = useSelector((state) => state.recentColors.recentColors);
  const showControlPanel = useSelector((state) => state.ui.showControlPanel);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const socketRef = useRef(null);
  const hasBannedRef = useRef(false);
  const [canvasWidth, setCanvasWidth] = useState(window.innerWidth);
  const [canvasHeight, setCanvasHeight] = useState(window.innerHeight);
  const [chunks, setChunks] = useState(new Map());
  const { isHudOpen } = useSettings();
  const [imageUrl, setImageUrl] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    showAuthenticationRequiredNotification,
    showOutOfPixelsNotification,
    showDisconnectedNotification,
    showConnectionRestoredNotification,
    showDonationAlert,
    showDonationMakeError,
    showDonationSuccess,
    showDonationError,
    showUserCanPlacePixel,
    showUserBan,
  } = useNotifications();
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [mouseDownTime, setMouseDownTime] = useState(0);
  const [secondsCount, setSecondsCount] = useState(0);
  const [inputColor, setInputColor] = useState(false);
  const [coins, setCoins] = useState(0);
  const [userColors, setUserColors] = useState([]);
  const [userAccess, setUserAccess] = useState(1);
  const [userCanPlacePixel, setUserCanPlacePixel] = useState(1);
  const uniqueIdentifier = localStorage.getItem('uniqueIdentifier');

  const canvasSize = useCanvasSize();

  useEffect(() => {
    if (
      userAccess === 0 &&
      socketRef.current &&
      isAuthenticated &&
      !hasBannedRef.current
    ) {
      showUserBan();
      hasBannedRef.current = true;
      socketRef.current.disconnect();
      setStatus('offline');
    }
  }, [userAccess, isAuthenticated, showUserBan]);

  useEffect(() => {
    const updateCanvasSize = () => {
      setCanvasWidth(window.innerWidth);
      setCanvasHeight(window.innerHeight);
    };
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  const handleIncreaseScale = () =>
    increaseScale(
      setScale,
      setOffset,
      scale,
      canvasWidth,
      canvasHeight,
      isSoundsOn
    );
  const handleDecreaseScale = () =>
    decreaseScale(
      setScale,
      setOffset,
      scale,
      canvasWidth,
      canvasHeight,
      isSoundsOn
    );
  const handleMoveUp = () => moveUp(setOffset);
  const handleMoveDown = () => moveDown(setOffset);
  const handleMoveLeft = () => moveLeft(setOffset);
  const handleMoveRight = () => moveRight(setOffset);
  const handleDoPayment = (
    paymentAmount,
    pixelCount = null,
    socket,
    showDonationAlert,
    showDonationMakeError,
    showDonationSuccess,
    showDonationError,
    isColorSubscription = false,
    coins
  ) =>
    doPayment(
      paymentAmount,
      pixelCount,
      socket,
      showDonationAlert,
      showDonationMakeError,
      showDonationSuccess,
      showDonationError,
      isColorSubscription,
      coins
    );

  const refreshToken = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token || !isAuthenticated) return false;

    try {
      const response = await fetch(`${API_URL}/srv/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const result = await response.json();
        localStorage.setItem('authToken', result.token);
        socketRef.current.auth.token = result.token;
        socketRef.current.emit('update-token', { token: result.token });
        return true;
      } else {
        dispatch(logout({ isSoundsOn }));
        return false;
      }
    } catch (error) {
      dispatch(logout({ isSoundsOn }));
      return false;
    }
  }, [isAuthenticated, dispatch, isSoundsOn]);

  const connectSocket = useCallback(() => {
    let serverUrl;
    if (location.pathname === '/single-player-game') {
      serverUrl = config.singlePlayerServerUrl;
    } else {
      serverUrl = config[`serverUrl_${serverNumber}`];
    }

    const token = localStorage.getItem('authToken');
    const uniqueIdentifier = localStorage.getItem('uniqueIdentifier');

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    socketRef.current = io(serverUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: {
        token: token || null,
        uniqueIdentifier: uniqueIdentifier || null,
      },
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', async () => {
      setStatus('online');
      setLastCheckTime(Date.now());
      socketRef.current.emit('route', location.pathname);
      if (isAuthenticated) {
        const tokenRefreshed = await refreshToken();
        if (!tokenRefreshed) {
          navigate('/');
        }
      }
    });

    socketRef.current.on('connect_error', (error) => {
      setStatus('offline');
      setLastCheckTime(Date.now());
      if (error.message.includes('Authentication error')) {
        dispatch(logout({ isSoundsOn }));
      } else {
        showDisconnectedNotification();
      }
    });

    socketRef.current.on('access-denied', () => {
      setStatus('offline');
      dispatch(logout({ isSoundsOn }));
    });

    const canvasEvent =
      location.pathname === '/single-player-game'
        ? 'single-player-canvas-data'
        : `canvas-data-${serverNumber}`;

    const pixelDrawnEvent =
      location.pathname === '/single-player-game'
        ? 'pixel-drawn-single'
        : `pixel-drawn-${serverNumber}`;

    const pixelUndoEvent =
      location.pathname === '/single-player-game'
        ? 'pixel-undo-single'
        : `pixel-undo-${serverNumber}`;

    socketRef.current.on(canvasEvent, (data) => {
      const canvasData = Array(canvasSize.height)
        .fill(null)
        .map(() => Array(canvasSize.width).fill('#FFFFFF'));
      data.forEach((pixel) => {
        if (canvasData[pixel.y] && canvasData[pixel.y][pixel.x]) {
          canvasData[pixel.y][pixel.x] = pixel.color;
        }
      });
      setPixels(canvasData);
    });

    socketRef.current.on(pixelDrawnEvent, (pixelData) => {
      pixelData.forEach(({ x, y, color }) => {
        setPixels((prevPixels) => {
          const newPixels = [...prevPixels];
          if (newPixels[y] && newPixels[y][x]) {
            newPixels[y][x] = color;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            drawPixel(ctx, x, y, color, scale, offset);
          }
          return newPixels;
        });
      });
    });

    socketRef.current.on(pixelUndoEvent, ({ x, y }) => {
      setPixels((prevPixels) => {
        const newPixels = [...prevPixels];
        if (newPixels[y] && newPixels[y][x]) {
          newPixels[y][x] = '#FFFFFF';
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          drawPixel(ctx, x, y, '#FFFFFF', scale, offset);
        }
        return newPixels;
      });
    });

    socketRef.current.on('no-more-pixels', (value) => {
      setHasNoMorePixels(value);
    });

    socketRef.current.on('user-count', (data) => {
      if (
        data &&
        data.totalUsers !== undefined &&
        data.totalConnections !== undefined
      ) {
        setUserCount(data);
      }
    });

    socketRef.current.on('user-pixel-count-update', (data) => {
      if (!isAuthenticated) return;
      setPixelCount(data.newPixelCount);
    });

    socketRef.current.on('user-pixel-count', (data) => {
      if (!isAuthenticated) return;
      setPixelCount(data.pixelCount);
    });

    socketRef.current.on('client-info', (data) => {
      if (!isAuthenticated) return;
      socketRef.current.emit('client-info', {
        uniqueIdentifier: localStorage.getItem('uniqueIdentifier'),
      });
    });

    socketRef.current.on('user-seconds-data', (data) => {
      if (!isAuthenticated) return;
      setSecondsCount(data.userPixelUpdateTime);
    });

    socketRef.current.on('user-color-sub-data', (data) => {
      if (!isAuthenticated) return;
      if (data.isColorSubscription === 1) {
        setInputColor(true);
      }
    });

    socketRef.current.on('user-coins', (data) => {
      if (!isAuthenticated) return;
      setCoins(data.coins);
    });

    socketRef.current.on('user-colors', (data) => {
      if (!isAuthenticated) return;
      setUserColors(data.colors || []);
    });

    socketRef.current.on('color-subscription-update', (data) => {
      if (!isAuthenticated) return;
      setInputColor(data.isColorSubscription);
    });

    socketRef.current.on('user-access', (data) => {
      if (!isAuthenticated) return;
      setUserAccess(data.access);
    });

    socketRef.current.on('user-canplace', (data) => {
      if (!isAuthenticated) return;
      setUserCanPlacePixel(data.canPlacePixel);
    });

    socketRef.current.on('user-access', (data) => {
      if (!isAuthenticated) return;
      setUserAccess(data.access);
    });

    socketRef.current.emit('route', window.location.pathname);
    if (location.pathname === '/single-player-game' && isAuthenticated) {
      socketRef.current.emit('route', '/single-player-game');
    }
  }, [
    serverNumber,
    canvasSize,
    navigate,
    isAuthenticated,
    refreshToken,
    dispatch,
    isSoundsOn,
  ]);

  useEffect(() => {
    connectSocket();
    const tokenRefreshInterval = setInterval(
      () => {
        refreshToken();
      },
      12 * 60 * 60 * 1000
    );

    return () => {
      clearInterval(tokenRefreshInterval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [connectSocket, location.pathname, refreshToken]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isAuthenticated && socketRef.current) {
        socketRef.current.emit('get-max-pixel-count', (data) => {
          setMaxPixelCount(data.maxPixelCount || Infinity);
        });
        socketRef.current.emit('user-increment-seconds');
        socketRef.current.emit('get-color-input-sub');
        socketRef.current.emit('get-coins');
        socketRef.current.emit('get-user-colors');
        socketRef.current.emit('get-user-access-canplace');
      }
    }, 2500);

    const pixelInterval = setInterval(() => {
      if (isAuthenticated) {
        setPixelCount((prevPixelCount) => {
          if (prevPixelCount < maxPixelCount) {
            return prevPixelCount + 1;
          } else {
            return prevPixelCount;
          }
        });
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(pixelInterval);
    };
  }, [maxPixelCount, isAuthenticated]);

  useEffect(() => {
    let checkIntervalId;

    const checkStatus = async () => {
      try {
        if (socketRef.current) {
          await socketRef.current.emit('check-server-status', (data) => {
            setStatus(data.status);
            setLastCheckTime(Date.now());
          });
        }
      } catch (error) {
        setStatus('offline');
        setLastCheckTime(Date.now());
      }
    };

    if (socketRef.current) {
      socketRef.current.on('disconnect', () => {
        setStatus('offline');
        if (isAuthenticated) {
          showDisconnectedNotification();
        }
      });

      socketRef.current.on('connect_error', () => {
        setStatus('offline');
      });

      socketRef.current.on('reconnect', () => {
        showConnectionRestoredNotification();
        setStatus('online');
        checkStatus();
      });
    }

    checkIntervalId = setInterval(checkStatus, 5000);

    return () => {
      clearInterval(checkIntervalId);
      if (socketRef.current) {
        socketRef.current.off('disconnect');
        socketRef.current.off('connect_error');
        socketRef.current.off('reconnect');
      }
    };
  }, [
    showDisconnectedNotification,
    showConnectionRestoredNotification,
    isAuthenticated,
  ]);

  const handleCanvasClickWrapper = useCallback(
    (e) => {
      handleCanvasClick(e, isDragging, (x, y) => {
        if (!isAuthenticated) {
          showAuthenticationRequiredNotification();
          return;
        }
        handlePixelClick(x, y, {
          isAuthenticated,
          canDraw,
          hasNoMorePixels,
          offset,
          scale,
          selectedColor,
          setCanDraw,
          setRemainingTime,
          setPixels,
          addRecentColor,
          dirtyPixels,
          dispatch,
          socket: socketRef.current,
          PIXEL_SIZE,
          hoveredPixelColor,
          pixelCount,
          showAuthenticationRequiredNotification,
          showOutOfPixelsNotification,
          isSoundsOn,
          canvasSize,
          userCanPlacePixel,
          showUserCanPlacePixel,
          userAccess,
          showUserBan,
        });
      });
    },
    [
      isDragging,
      isAuthenticated,
      canDraw,
      hasNoMorePixels,
      offset,
      scale,
      selectedColor,
      setCanDraw,
      setRemainingTime,
      setPixels,
      dispatch,
      socketRef.current,
      hoveredPixelColor,
      pixelCount,
      showAuthenticationRequiredNotification,
      showOutOfPixelsNotification,
      isSoundsOn,
    ]
  );

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newOffsetX = offset.x + (e.clientX - dragStart.x);
      const newOffsetY = offset.y + (e.clientY - dragStart.y);
      setOffset({ x: newOffsetX, y: newOffsetY });
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor(
      (e.clientX - rect.left - offset.x) / (PIXEL_SIZE * scale)
    );
    const y = Math.floor(
      (e.clientY - rect.top - offset.y) / (PIXEL_SIZE * scale)
    );

    setHoveredCoordinates({ x, y });

    if (
      y >= 0 &&
      y < pixels.length &&
      x >= 0 &&
      x < pixels[0].length &&
      pixels[y][x] &&
      pixels[y][x] !== '#FFFFFF'
    ) {
      socketRef.current.emit('get-username', { x, y }, (response) => {
        if (response && response.success) {
          setHoveredUsername(response.username);
        } else {
          setHoveredUsername(null);
        }
      });

      socketRef.current.emit('get-pixel-color', { x, y }, (response) => {
        if (response && response.success) {
          setHoveredPixelColor(response.color);
        } else {
          setHoveredPixelColor(null);
        }
      });
    } else {
      setHoveredUsername(null);
      setHoveredPixelColor(null);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = (timestamp) => {
      const visibleChunks = getVisibleChunks(
        offset,
        scale,
        canvasWidth,
        canvasHeight,
        canvasSize.width,
        canvasSize.height
      );

      setChunks((prevChunks) =>
        updateChunks(prevChunks, visibleChunks, timestamp)
      );

      drawCanvas(
        pixels,
        ctx,
        offset,
        scale,
        canvasWidth,
        canvasHeight,
        canvasSize.width,
        canvasSize.height,
        chunks
      );

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [pixels, offset, scale, canvasWidth, canvasHeight, canvasSize]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const userIdentifier = localStorage.getItem('uniqueIdentifier');
    if (!userIdentifier) {
      return;
    }

    socketRef.current.emit('client-info', { uniqueIdentifier: userIdentifier });

    const handleMaxPixelCountUpdate = ({ maxPixelCount }) => {
      DBsetMaxPixelCount(maxPixelCount);
      setIsSubscribed(maxPixelCount >= 200);
    };

    socketRef.current.on('max-pixel-count-update', handleMaxPixelCountUpdate);

    return () => {
      socketRef.current.off(
        'max-pixel-count-update',
        handleMaxPixelCountUpdate
      );
    };
  }, [isAuthenticated]);

  useAchievements({ socket: socketRef.current });

  const handleImageUpload = (url) => {
    if (!isAuthenticated) {
      showAuthenticationRequiredNotification();
      return;
    }
    setImageUrl(url);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  useEffect(() => {
    const handleWheel = (e) => {
      if (
        e.target.closest('.chat-container.chat-container-open') ||
        e.target.closest('.bottom-left-panel___container')
      ) {
        return;
      }
      if (e.deltaY < 0) {
        handleIncreaseScale();
      } else if (e.deltaY > 0) {
        handleDecreaseScale();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [handleIncreaseScale, handleDecreaseScale]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <AchievementShow socket={socketRef.current} />
      <ServerStatus
        serverNumber={serverNumber}
        status={location.pathname === '/single-player-game' ? 'local' : status}
      />
      <ServersMenu
        socket={socketRef.current}
        isAuthenticated={isAuthenticated}
      />
      <DonationButton
        amount={amount}
        setAmount={setAmount}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        handleDoPayment={handleDoPayment}
        isAuthenticated={isAuthenticated}
      />
      {isHudOpen ? (
        <>
          <h3 className="useful-bar">
            {isAuthenticated && (
              <UserSubscription
                isAuthenticated={isAuthenticated}
                isSubscribed={isSubscribed}
                pixelCount={pixelCount}
                DBmaxPixelCount={DBmaxPixelCount}
                setIsOpenSubscription={setIsOpenSubscription}
              />
            )}
            {isAuthenticated && socketRef.current && (
              <SubscribtionModal
                isOpenSubscription={isOpenSubscription}
                setIsOpenSubscription={setIsOpenSubscription}
                DBmaxPixelCount={DBmaxPixelCount}
                socket={socketRef.current}
                doPayment={handleDoPayment}
                showDonationAlert={showDonationAlert}
                showDonationMakeError={showDonationMakeError}
                showDonationSuccess={showDonationSuccess}
                showDonationError={showDonationError}
                inputColor={inputColor}
              />
            )}
            <CoordinateHint
              hoveredCoordinates={
                status === 'online' ? hoveredCoordinates : { x: null, y: null }
              }
              hoveredUsername={status === 'online' ? hoveredUsername : null}
              hoveredPixelColor={status === 'online' ? hoveredPixelColor : null}
            />
            <div className="User-counter__container">
              <p>Посетителей на сайте: {userCount.totalConnections}</p>
              из них
              <p>Пользователей онлайн: {userCount.totalUsers}</p>
            </div>
            {isAuthenticated && (
              <PixelStatus
                canDraw={canDraw}
                remainingTime={remainingTime}
                pixelCount={pixelCount}
                secondsCount={secondsCount}
              />
            )}
          </h3>
        </>
      ) : null}
      <ColorSelector
        isAuthenticated={isAuthenticated}
        showControlPanel={showControlPanel}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        recentColors={recentColors}
        handleIncreaseScale={handleIncreaseScale}
        handleDecreaseScale={handleDecreaseScale}
        handleMoveUp={handleMoveUp}
        handleMoveLeft={handleMoveLeft}
        handleMoveDown={handleMoveDown}
        handleMoveRight={handleMoveRight}
        socket={socketRef.current}
        handleImageUpload={handleImageUpload}
        closeModal={closeModal}
        isModalOpen={isModalOpen}
        imageUrl={imageUrl}
        inputColor={inputColor}
        coins={coins}
        userColors={userColors}
      />
      {isHudOpen && isAuthenticated ? (
        <>
          <Chat
            socket={socketRef.current}
            isAuthenticated={isAuthenticated}
            uniqueIdentifier={uniqueIdentifier}
            handleIncreaseScale={handleIncreaseScale}
            handleDecreaseScale={handleDecreaseScale}
          />
        </>
      ) : null}

      <div
        ref={containerRef}
        className="canvas__container"
        style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas
          className="canvas__main"
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{ display: 'block' }}
          onClick={handleCanvasClickWrapper}
          onMouseDown={(e) =>
            handleMouseDown(e, setIsDragging, setDragStart, setMouseDownTime)
          }
          onMouseUp={(e) =>
            handleMouseUp(
              e,
              setIsDragging,
              isContextMenuOpen,
              setIsContextMenuOpen,
              setContextMenuPosition,
              mouseDownTime
            )
          }
          onMouseMove={handleMouseMove}
        />
        {isAuthenticated && (
          <>
            {isContextMenuOpen && (
              <ContextMenu
                position={contextMenuPosition}
                onClose={() => setIsContextMenuOpen(false)}
                isAuthenticated={isAuthenticated}
                selectedColor={selectedColor}
                setSelectedColor={setSelectedColor}
                socket={socketRef.current}
                inputColor={inputColor}
                userColors={userColors}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

Canvas.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired,
};

export default React.memo(Canvas);

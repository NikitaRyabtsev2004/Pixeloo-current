import React, { useEffect, useState, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import useNotifications from '../../utils/helpers/notifications';
import PropTypes from 'prop-types';
import {
  PIXEL_SIZE,
  GRID_HEIGHT,
  GRID_WIDTH,
  GRID_WIDTH_BATTLE,
  GRID_HEIGHT_BATTLE,
} from '../../utils/config/canvas-size';
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
import NotificationModal from '../modal/NotificationModal.jsx';
import BattleGameModal from '../modal/BattleGameModal.jsx';
import ServersMenu from '../ui/ServersMenu.jsx';

let socket;

const Canvas = ({ isAuthenticated }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const serverNumber =
    location.pathname === '/single-player-game'
      ? 'single'
      : location.pathname.split('-')[1] || '1';
  let dirtyPixels = [];
  const [pixels, setPixels] = useState([]);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [userCount, setUserCount] = useState(0);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canDraw, setCanDraw] = useState(true);
  const [remainingTime, setRemainingTime] = useState(0);
  const [pixelCount, setPixelCount] = useState(0);
  const [hasNoMorePixels, setHasNoMorePixels] = useState(false);
  const [status, setStatus] = useState('');
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
  const dispatch = useDispatch();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasWidth, setCanvasWidth] = useState(window.innerWidth);
  const [canvasHeight, setCanvasHeight] = useState(window.innerHeight);
  const [chunks, setChunks] = useState(new Map());
  const { isHudOpen, isSoundsOn } = useSettings();
  const [imageUrl, setImageUrl] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    showAuthenticationRequiredNotification,
    showOutOfPixelsNotification,
    showDisconnectedNotification,
    showConnectionRestoredNotification,
    showDonationAlert,
    showDonationMakeError,
    showDonationSucces,
    showDonationError,
  } = useNotifications();

  const { gameId } = useParams(); // Получаем gameId из URL
  const isBattleMode = location.pathname.startsWith('/battle');
  const [canvasSize] = useState({
    width: isBattleMode ? GRID_WIDTH_BATTLE : GRID_WIDTH,
    height: isBattleMode ? GRID_HEIGHT_BATTLE : GRID_HEIGHT,
  });

  const [gameState, setGameState] = useState('waiting'); // Состояние игры: waiting, countdown, drawing, evaluation, finished
  const [word, setWord] = useState(null); // Слово для рисования
  const [countdown, setCountdown] = useState(null); // Обратный отсчёт до начала
  const [drawingTime, setDrawingTime] = useState(null); // Время на рисование
  const [isEvaluating, setIsEvaluating] = useState(false); // Флаг этапа оценки
  const [currentEvaluation, setCurrentEvaluation] = useState(null); // Данные текущего холста для оценки
  const [gameResults, setGameResults] = useState(null); // Результаты игры
  const [isBattleModalOpen, setIsBattleModalOpen] = useState(isBattleMode);

  // update canvas size
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
  const handleDoPayment = (paymentAmount, pixelCount = null) =>
    doPayment(
      paymentAmount,
      pixelCount,
      socket,
      showDonationAlert,
      showDonationMakeError,
      showDonationSucces,
      showDonationError
    );

  useEffect(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0) {
      setPixels(
        Array(canvasSize.height)
          .fill(null)
          .map(() => Array(canvasSize.width).fill('#FFFFFF'))
      );
    }
  }, [canvasSize]);

  const connectSocket = useCallback(() => {
    let serverUrl;
    if (isBattleMode) {
      const serverId = gameId.split('_')[0] || 'b1';
      serverUrl = config[`serverUrl_${serverId}`];
    } else if (location.pathname === '/single-player-game') {
      serverUrl = config.singlePlayerServerUrl;
    } else {
      serverUrl = config[`serverUrl_${serverNumber}`];
    }
    socket = io(serverUrl, {
      auth: {
        token: localStorage.getItem('authToken'),
        uniqueIdentifier: localStorage.getItem('uniqueIdentifier'),
      },
    });

    socket.on('connect', () => {
      console.log('Сокет успешно подключен');
      socket.emit('route', location.pathname); // Отправляем текущий маршрут
    });

    socket.on('connect_error', (error) => {
      console.error('Ошибка подключения сокета:', error);
    });

    const canvasEvent = isBattleMode
      ? 'battle-canvas-data'
      : location.pathname === '/single-player-game'
        ? 'single-player-canvas-data'
        : `canvas-data-${serverNumber}`;

    const pixelDrawnEvent = isBattleMode
      ? 'battle-pixel-drawn'
      : location.pathname === '/single-player-game'
        ? 'pixel-drawn-single'
        : `pixel-drawn-${serverNumber}`;

    socket.on(canvasEvent, (data) => {
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

    socket.on(pixelDrawnEvent, (pixelData) => {
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

    socket.on('battle-canvas-data', (data) => {
      const canvasData = Array(canvasSize.height)
        .fill(null)
        .map(() => Array(canvasSize.width).fill('#FFFFFF'));
      data.forEach((pixel) => {
        if (canvasData[pixel.y] && canvasData[pixel.y][pixel.x]) {
          canvasData[pixel.y][pixel.x] = pixel.color;
        }
      });
      setPixels(canvasData); // Обновляем состояние холста
    });

    socket.on('battle-pixel-drawn', ({ x, y, color }) => {
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

    const handleUsernameRequest = ({ x, y }, callback) => {
      if (location.pathname === '/single-player-game') {
        // Для single-player возвращаем имя текущего пользователя
        const username = localStorage.getItem('username') || 'Вы';
        callback({ success: true, username });
      } else {
        // Стандартная логика для онлайн-режимов
        socket.emit('get-username', { x, y }, callback);
      }
    };

    const handleColorRequest = ({ x, y }, callback) => {
      if (location.pathname === '/single-player-game') {
        // Для single-player проверяем локальное состояние
        const color = pixels[y]?.[x] || '#FFFFFF';
        callback({ success: true, color });
      } else {
        // Стандартная логика для онлайн-режимов
        socket.emit('get-pixel-color', { x, y }, callback);
      }
    };

    if (isBattleMode) {
      socket.on('game-state', (data) => {
        setGameState(data.status);
        if (data.status === 'waiting' || data.status === 'countdown') {
          setIsBattleModalOpen(true);
        } else {
          setIsBattleModalOpen(false);
        }
      });

      socket.on('countdownStarted', (data) => {
        setCountdown(data.timeLeft);
      });

      socket.on('startDrawing', (data) => {
        setWord(data.word);
        setDrawingTime(data.timeLeft);
      });

      socket.on('startEvaluation', () => {
        setIsEvaluating(true);
      });

      socket.on('evaluateCanvas', (data) => {
        setCurrentEvaluation({
          playerId: data.playerId,
          canvasData: data.canvasData,
        });
      });

      socket.on('gameEnd', (data) => {
        setGameResults({ scores: data.scores, winner: data.winner });
        setTimeout(() => {
          window.location.href = '/canvas-1'; // Перенаправление после игры
        }, 5000);
      });

      socket.emit('join-game-room', { gameId });
    }

    socket.on('no-more-pixels', (value) => {
      setHasNoMorePixels(value);
    });

    socket.on('user-count', (data) => {
      if (
        data &&
        data.totalUsers !== undefined &&
        data.totalConnections !== undefined
      ) {
        setUserCount(data);
      }
    });
    socket.on('user-pixel-count-update', (data) => {
      setPixelCount(data.newPixelCount);
    });
    socket.on('user-pixel-count', (data) => {
      setPixelCount(data.pixelCount);
    });
    socket.on('connect_error', () => {});
    
    socket.emit('client-info', {
      uniqueIdentifier: localStorage.getItem('uniqueIdentifier'),
    });

    socket.on('access-denied', (data) => {
      navigate('/');
    });

    socket.emit('route', window.location.pathname);
    if (location.pathname === '/single-player-game') {
      socket.emit('route', '/single-player-game');
    }
  }, [
    isBattleMode,
    gameId,
    serverNumber,
    canvasSize.height,
    canvasSize.width,
    navigate,
  ]);

  useEffect(() => {
    connectSocket();
  }, [connectSocket]);

  useEffect(() => {
    socket.on('startGame', (data) => {
      console.log('startGame received in App.jsx:', data);
      navigate(`/battle/${data.gameId}`);
    });
    return () => {
      socket.off('startGame');
    };
  });

  useEffect(() => {
    if (!status && Date.now() - lastCheckTime > 1000) {
      setStatus('offline');
    }
  }, [status, lastCheckTime]);

  useEffect(() => {
    setInterval(() => {
      socket.emit('get-max-pixel-count', (data) => {
        setMaxPixelCount(data.maxPixelCount || Infinity);
      });
    }, 5000);

    setInterval(() => {
      setPixelCount((prevPixelCount) => {
        if (prevPixelCount < maxPixelCount) {
          return prevPixelCount + 1;
        } else {
          return prevPixelCount;
        }
      });
    }, 1000);
  }, [maxPixelCount]);

  useEffect(() => {
    let checkIntervalId;

    const checkStatus = async () => {
      try {
        await socket.emit('check-server-status', (data) => {
          setStatus(data.status);
          setLastCheckTime(Date.now());
        });
      } catch (error) {
        setStatus('offline');
        setLastCheckTime(Date.now());
      }
    };

    socket.on('disconnect', () => {
      showDisconnectedNotification();
      setStatus('offline');
    });

    socket.on('connect_error', () => {
      showAuthenticationRequiredNotification();
      setStatus('offline');
    });

    socket.on('reconnect', () => {
      showConnectionRestoredNotification();
      setStatus('online');
      checkStatus();
    });

    checkIntervalId = setInterval(checkStatus, 1000);

    return () => {
      clearInterval(checkIntervalId);
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('reconnect');
    };
  }, []);

  const handleCanvasClickWrapper = (e) =>
    handleCanvasClick(e, isDragging, (x, y) => {
      if (isBattleMode && gameState !== 'drawing') {
        return; // Нельзя рисовать вне этапа рисования
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
        socket,
        PIXEL_SIZE,
        hoveredPixelColor,
        pixelCount,
        showAuthenticationRequiredNotification,
        showOutOfPixelsNotification,
        isSoundsOn,
      });
    });

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
      socket.emit('get-username', { x, y }, (response) => {
        if (response && response.success) {
          setHoveredUsername(response.username);
        } else {
          setHoveredUsername(null);
        }
      });

      socket.emit('get-pixel-color', { x, y }, (response) => {
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

  // chunks
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = (timestamp) => {
      // get visible chunks
      const visibleChunks = getVisibleChunks(
        offset,
        scale,
        canvasWidth,
        canvasHeight,
        canvasSize.width,
        canvasSize.height
      );

      // chunk update
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
    const userIdentifier = localStorage.getItem('uniqueIdentifier');
    if (!userIdentifier) {
      return;
    }

    socket.auth = { uniqueIdentifier: userIdentifier };
    socket.connect();

    const handleMaxPixelCountUpdate = ({ maxPixelCount }) => {
      DBsetMaxPixelCount(maxPixelCount);
      setIsSubscribed(maxPixelCount >= 200);
    };

    socket.on('max-pixel-count-update', handleMaxPixelCountUpdate);

    return () => {
      socket.off('max-pixel-count-update', handleMaxPixelCountUpdate);
    };
  }, []);

  useAchievements({ socket });

  const handleImageUpload = (url) => {
    setImageUrl(url);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  useEffect(() => {
    let timer;
    if (isBattleMode) {
      if (countdown > 0) {
        timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
      } else if (drawingTime > 0) {
        timer = setInterval(() => setDrawingTime((prev) => prev - 1), 1000);
      }
    }
    return () => clearInterval(timer);
  }, [isBattleMode, countdown, drawingTime]);

  useEffect(() => {
    socket.on('access-granted', (data) => {
      console.log(`Доступ к игре ${data.gameId} разрешён`);
      setGameState('countdown'); // Устанавливаем начальное состояние
    });
    socket.on('access-denied', (data) => {
      console.log('Access denied:', data.message);
      alert(data.message);
      navigate('/');
    });
    return () => {
      socket.off('access-granted');
      socket.off('access-denied');
    };
  }, [navigate]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <AchievementShow socket={socket} />
      <ServerStatus
        serverNumber={serverNumber}
        status={location.pathname === '/single-player-game' ? 'local' : status}
      />
      <ServersMenu socket={socket} />
      <DonationButton
        amount={amount}
        isOpen={isOpen}
        setAmount={setAmount}
        setIsOpen={setIsOpen}
        handleDoPayment={handleDoPayment}
        isAuthenticated={isAuthenticated}
      />
      {isBattleMode && (
        <BattleGameModal
          gameId={gameId}
          isOpen={isBattleModalOpen}
          onClose={() => setIsBattleModalOpen(false)}
        />
      )}
      {isHudOpen ? (
        <>
          <h3 className="useful-bar">
            <UserSubscription
              isAuthenticated={isAuthenticated}
              isSubscribed={isSubscribed}
              pixelCount={pixelCount}
              DBmaxPixelCount={DBmaxPixelCount}
              setIsOpenSubscription={setIsOpenSubscription}
            />
            {socket && (
              <SubscribtionModal
                isOpenSubscription={isOpenSubscription}
                setIsOpenSubscription={setIsOpenSubscription}
                DBmaxPixelCount={DBmaxPixelCount}
                socket={socket}
                doPayment={handleDoPayment}
              />
            )}
            <CoordinateHint
              hoveredCoordinates={hoveredCoordinates}
              hoveredUsername={hoveredUsername}
              hoveredPixelColor={hoveredPixelColor}
            />
            <div className="User-counter__container">
              <p>Посетителей на сайте: {userCount.totalConnections}</p>
              из них
              <p>Пользователей онлайн: {userCount.totalUsers}</p>
            </div>
            <PixelStatus
              canDraw={canDraw}
              remainingTime={remainingTime}
              pixelCount={pixelCount}
            />
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
        socket={socket}
        handleImageUpload={handleImageUpload}
        closeModal={closeModal}
        isModalOpen={isModalOpen}
        imageUrl={imageUrl}
      />

      <div
        ref={containerRef}
        className="canvas__container"
        style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
      >
        <canvas
          className="canvas__main"
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{ display: 'block' }}
          onClick={handleCanvasClickWrapper}
          onMouseDown={(e) => handleMouseDown(e, setIsDragging, setDragStart)}
          onMouseUp={(e) => handleMouseUp(e, setIsDragging)}
          onMouseMove={handleMouseMove}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </div>
  );
};

Canvas.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired,
};

export default React.memo(Canvas);

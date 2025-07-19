import { playSoundCanvas } from '../sounds/sounds';
import { drawPixel } from './canvasHelpers';

const isValidHexColor = (color) => {
  return /^#([0-9A-F]{3}){1,2}$/i.test(color);
};

export const applyDirtyPixels = (canvasRef, dirtyPixels) => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  dirtyPixels.forEach(({ x, y, color }) => {
    drawPixel(ctx, x, y, color);
  });

  dirtyPixels.length = 0;
};

export const handlePixelClick = (
  x,
  y,
  {
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
    canvasSize,
  }
) => {
  const adjustedX = Math.floor((x - offset.x) / (PIXEL_SIZE * scale));
  const adjustedY = Math.floor((y - offset.y) / (PIXEL_SIZE * scale));

  if (!isAuthenticated || !localStorage.getItem('uniqueIdentifier') || !localStorage.getItem('authToken')) {
    showAuthenticationRequiredNotification();
    return;
  }

  if (!canDraw) {
    return;
  }

  if (hoveredPixelColor === selectedColor) {
    return;
  }

  if (!isValidHexColor(selectedColor)) {
    return;
  }

  if (hasNoMorePixels || pixelCount === 0) {
    showOutOfPixelsNotification();
    return;
  }

  if (
    adjustedX < 0 ||
    adjustedY < 0 ||
    adjustedX >= canvasSize.width ||
    adjustedY >= canvasSize.height ||
    !Number.isInteger(adjustedX) ||
    !Number.isInteger(adjustedY)
  ) {
    return;
  }

  const isSinglePlayerGame = window.location.pathname === '/single-player-game';

  playSoundCanvas(0.2, isSoundsOn);

  if (!isSinglePlayerGame) {
    setCanDraw(false);
    setRemainingTime(500);

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 100) {
          clearInterval(interval);
          setCanDraw(true);
          return 0;
        }
        return prev - 100;
      });
    }, 100);
  }

  const color = selectedColor;

  dispatch(addRecentColor(color));

  const newPixel = {
    x: adjustedX,
    y: adjustedY,
    color,
    userId: localStorage.getItem('uniqueIdentifier'),
  };

  dirtyPixels.push(newPixel);

  setPixels((prevPixels) => {
    if (!prevPixels[adjustedY] || !prevPixels[adjustedY][adjustedX]) {
      return prevPixels; 
    }
    const newPixels = [...prevPixels];
    newPixels[adjustedY] = [...newPixels[adjustedY]];
    newPixels[adjustedY][adjustedX] = newPixel.color;
    return newPixels;
  });

  socket.emit('draw-pixel', newPixel);
};

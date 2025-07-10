import { PIXEL_SIZE } from '../../config/canvas-size';
import { playSound } from '../sounds/sounds';

const CHUNK_SIZE = 25;
const FADE_DURATION = 1500;
const BUFFER_CHUNKS = 0.4;

const getChunkId = (cx, cy) => `${cx},${cy}`;

export const getVisibleChunks = (
  offset,
  scale,
  canvasWidth,
  canvasHeight,
  gridWidth,
  gridHeight
) => {
  const pixelSizeScaled = PIXEL_SIZE * scale;

  const minX = Math.max(0, Math.floor(-offset.x / pixelSizeScaled));
  const maxX = Math.min(
    gridWidth - 1,
    Math.ceil((canvasWidth - offset.x) / pixelSizeScaled)
  );
  const minY = Math.max(0, Math.floor(-offset.y / pixelSizeScaled));
  const maxY = Math.min(
    gridHeight - 1,
    Math.ceil((canvasHeight - offset.y) / pixelSizeScaled)
  );

  const minChunkX = Math.max(0, Math.floor(minX / CHUNK_SIZE) - BUFFER_CHUNKS);
  const maxChunkX = Math.min(
    Math.floor(gridWidth / CHUNK_SIZE),
    Math.floor(maxX / CHUNK_SIZE) + BUFFER_CHUNKS
  );
  const minChunkY = Math.max(0, Math.floor(minY / CHUNK_SIZE) - BUFFER_CHUNKS);
  const maxChunkY = Math.min(
    Math.floor(gridHeight / CHUNK_SIZE),
    Math.floor(maxY / CHUNK_SIZE) + BUFFER_CHUNKS
  );

  const visibleChunks = new Set();
  for (let cy = minChunkY; cy <= maxChunkY; cy++) {
    for (let cx = minChunkX; cx <= maxChunkX; cx++) {
      visibleChunks.add(getChunkId(cx, cy));
    }
  }
  return visibleChunks;
};

const drawChunk = (ctx, chunk, canvasData, scale, offset) => {
  const { cx, cy, alpha } = chunk;
  const startX = cx * CHUNK_SIZE;
  const endX = Math.min(startX + CHUNK_SIZE - 1, canvasData[0].length - 1);
  const startY = cy * CHUNK_SIZE;
  const endY = Math.min(startY + CHUNK_SIZE - 1, canvasData.length - 1);

  const pixelSizeScaled = PIXEL_SIZE * scale;

  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const color = canvasData[y][x];

      if (color === '#FFFFFF') continue;

      const canvasX = Math.round(x * pixelSizeScaled + offset.x);
      const canvasY = Math.round(y * pixelSizeScaled + offset.y);
      const size = Math.round(pixelSizeScaled);

      if (
        canvasX >= -size &&
        canvasX < ctx.canvas.width &&
        canvasY >= -size &&
        canvasY < ctx.canvas.height
      ) {
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(canvasX, canvasY, size, size);
      }
    }
  }
  ctx.globalAlpha = 1; // Reset transparency
};

export const drawGridBorder = (ctx, scale, offset, gridWidth, gridHeight) => {
  const pixelSizeScaled = PIXEL_SIZE * scale;
  ctx.globalAlpha = 1;

  const minX = Math.round(offset.x);
  const minY = Math.round(offset.y);
  const maxX = Math.round(gridWidth * pixelSizeScaled + offset.x);
  const maxY = Math.round(gridHeight * pixelSizeScaled + offset.y);

  ctx.beginPath();
  ctx.rect(minX, minY, maxX - minX, maxY - minY);
  ctx.stroke();
};

// Update chunks
export const updateChunks = (chunks, visibleChunks, timestamp) => {
  const newChunks = new Map();

  visibleChunks.forEach((chunkId) => {
    if (chunks.has(chunkId)) {
      const chunk = chunks.get(chunkId);
      chunk.alpha = Math.min(
        chunk.alpha + (timestamp - chunk.lastUpdate) / FADE_DURATION,
        1
      );
      chunk.lastUpdate = timestamp;
      newChunks.set(chunkId, chunk);
    } else {
      newChunks.set(chunkId, {
        cx: parseInt(chunkId.split(',')[0]),
        cy: parseInt(chunkId.split(',')[1]),
        alpha: 0,
        lastUpdate: timestamp,
      });
    }
  });

  // Update vanishing chunks
  chunks.forEach((chunk, chunkId) => {
    if (!visibleChunks.has(chunkId)) {
      chunk.alpha = Math.max(
        chunk.alpha - (timestamp - chunk.lastUpdate) / FADE_DURATION,
        0
      );
      chunk.lastUpdate = timestamp;
      if (chunk.alpha > 0) {
        newChunks.set(chunkId, chunk);
      }
    }
  });

  return newChunks;
};

// Draw canvas with chunks, background, and border
export const drawCanvas = (
  canvasData,
  ctx,
  offset,
  scale,
  canvasWidth,
  canvasHeight,
  gridWidth,
  gridHeight,
  chunks
) => {
  if (!ctx || !canvasData || !canvasData[0]) return;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const pixelSizeScaled = PIXEL_SIZE * scale;
  const minX = Math.round(offset.x);
  const minY = Math.round(offset.y);
  const maxX = Math.round(gridWidth * pixelSizeScaled + offset.x);
  const maxY = Math.round(gridHeight * pixelSizeScaled + offset.y);

  ctx.fillStyle = '#ffffff'; 
  ctx.globalAlpha = 1;
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

  chunks.forEach((chunk) => {
    drawChunk(ctx, chunk, canvasData, scale, offset);
  });

  drawGridBorder(ctx, scale, offset, gridWidth, gridHeight);
};

// Draw a single pixel
export const drawPixel = (ctx, x, y, color, scale, offset) => {
  if (color === '#FFFFFF') return;

  const pixelSizeScaled = PIXEL_SIZE * scale;
  const canvasX = Math.round(x * pixelSizeScaled + offset.x);
  const canvasY = Math.round(y * pixelSizeScaled + offset.y);
  const size = Math.round(pixelSizeScaled);
  ctx.fillStyle = color;
  ctx.fillRect(canvasX, canvasY, size, size);
};

// Zoom in
export const increaseScale = (
  setScale,
  setOffset,
  currentScale,
  canvasWidth,
  canvasHeight,
  isSoundsOn
) => {
  if (currentScale < 5) {
    const newScale = currentScale * 1.2;
    const scaleFactor = newScale / currentScale;
    setScale(newScale);
    playSound(0.15, 'scroll.mp3', isSoundsOn);
    setOffset((prevOffset) => ({
      x: Math.round(
        canvasWidth / 2 - scaleFactor * (canvasWidth / 2 - prevOffset.x)
      ),
      y: Math.round(
        canvasHeight / 2 - scaleFactor * (canvasHeight / 2 - prevOffset.y)
      ),
    }));
  }
};

// Zoom out
export const decreaseScale = (
  setScale,
  setOffset,
  currentScale,
  canvasWidth,
  canvasHeight,
  isSoundsOn
) => {
  if (currentScale > 0.03) {
    const newScale = currentScale / 1.2;
    const scaleFactor = newScale / currentScale;
    setScale(newScale);
    playSound(0.15, 'scroll.mp3', isSoundsOn);
    setOffset((prevOffset) => ({
      x: Math.round(
        canvasWidth / 2 - scaleFactor * (canvasWidth / 2 - prevOffset.x)
      ),
      y: Math.round(
        canvasHeight / 2 - scaleFactor * (canvasHeight / 2 - prevOffset.y)
      ),
    }));
  }
};

// Move up
export const moveUp = (setOffset) => {
  setOffset((prevOffset) => ({ ...prevOffset, y: prevOffset.y + 50 }));
};

// Move down
export const moveDown = (setOffset) => {
  setOffset((prevOffset) => ({ ...prevOffset, y: prevOffset.y - 50 }));
};

// Move left
export const moveLeft = (setOffset) => {
  setOffset((prevOffset) => ({ ...prevOffset, x: prevOffset.x + 50 }));
};

// Move right
export const moveRight = (setOffset) => {
  setOffset((prevOffset) => ({ ...prevOffset, x: prevOffset.x - 50 }));
};
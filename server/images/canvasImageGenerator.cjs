const { createCanvas } = require('canvas');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');
const express = require('express');
const { logger } = require('../utils/libs/logger.cjs');
const { getCanvasStatus } = require('../database/dbQueries.cjs');

const router = express.Router();

const BASE_IMAGE_DIR = path.join(__dirname, '../canvas_images');
const FULLSIZE_IMAGE_DIR = path.join(__dirname, '../canvas_images/fullsize');
const CANVAS_SIZE = 250; 
const FULLSIZE_CANVAS = 2000;
const MAX_REGULAR_IMAGES = 5;
const CANVASES = {
  'canvas1': 'Canvas',
  'canvas2': 'Canvas2',
  'canvas3': 'Canvas3',
};

async function ensureImageDir() {
  try {
    await fs.mkdir(BASE_IMAGE_DIR, { recursive: true });
    await fs.mkdir(FULLSIZE_IMAGE_DIR, { recursive: true });
    for (const canvasName of Object.keys(CANVASES)) {
      const subDir = path.join(BASE_IMAGE_DIR, canvasName);
      const fullsizeSubDir = path.join(FULLSIZE_IMAGE_DIR, canvasName);
      await fs.mkdir(subDir, { recursive: true });
      await fs.mkdir(fullsizeSubDir, { recursive: true });
    }
  } catch (err) {
    logger.error('Error creating image directories:', err.message);
  }
}

async function generateCanvasImage(canvasName, dbTableName) {
  try {
    logger.info(`Generating images for ${canvasName} at ${new Date().toISOString()}`);
    
    const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
    const ctx = canvas.getContext('2d');
    
    const fullsizeCanvas = createCanvas(FULLSIZE_CANVAS, FULLSIZE_CANVAS);
    const fullsizeCtx = fullsizeCanvas.getContext('2d');

    // eslint-disable-next-line no-unused-vars
    const rows = await new Promise((resolve, reject) => {
      getCanvasStatus(dbTableName, {
        emit: (eventName, data) => resolve(data),
      }, `/canvas-${Object.keys(CANVASES).find(key => CANVASES[key] === dbTableName).slice(-1)}`);
    });

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    fullsizeCtx.fillStyle = '#FFFFFF';
    fullsizeCtx.fillRect(0, 0, FULLSIZE_CANVAS, FULLSIZE_CANVAS);

    rows.forEach(({ x, y, color }) => {
      if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      } else {
        //! logger.warn(`Invalid pixel coordinates for ${canvasName} (regular): x=${x}, y=${y}`);
      }

      if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
        fullsizeCtx.fillStyle = color;
        fullsizeCtx.fillRect(x, y, 1, 1);
      } else {
        //! logger.warn(`Invalid pixel coordinates for ${canvasName} (fullsize): x=${x}, y=${y}`);
      }
    });

    const timestamp = moment().format('DD_MM_YY-HH[h]-mm[m]-ss[s]');
    const filename = `${canvasName}-${timestamp}.png`;
    const subDir = path.join(BASE_IMAGE_DIR, canvasName);
    const fullsizeSubDir = path.join(FULLSIZE_IMAGE_DIR, canvasName);
    const filepath = path.join(subDir, filename);
    const fullsizeFilepath = path.join(fullsizeSubDir, filename);

    const buffer = canvas.toBuffer('image/png', { compressionLevel: 3 }); 
    await fs.writeFile(filepath, buffer);
    logger.info(`Saved regular canvas image: ${filepath}`);

    try {
      const files = await fs.readdir(subDir);
      const canvasFiles = files
        .filter(file => file.startsWith(canvasName) && file.endsWith('.png'))
        .sort(); 
      if (canvasFiles.length > MAX_REGULAR_IMAGES) {
        const oldestFile = canvasFiles[0];
        const oldestFilepath = path.join(subDir, oldestFile);
        await fs.unlink(oldestFilepath);
        //? logger.info(`Deleted oldest regular image: ${oldestFilepath}`);
      }
    } catch (err) {
      logger.error(`Error managing regular images for ${canvasName}:`, err.message);
    }

    const fullsizeBuffer = fullsizeCanvas.toBuffer('image/png', { compressionLevel: 9 }); 
    await fs.writeFile(fullsizeFilepath, fullsizeBuffer);
    logger.info(`Saved full-size canvas image: ${fullsizeFilepath}`);
  } catch (err) {
    logger.error(`Error generating images for ${canvasName}:`, err.message);
  }
}

async function startImageGeneration(io) {
  await ensureImageDir();

  setInterval(async () => {
    for (const [canvasName, dbTableName] of Object.entries(CANVASES)) {
      await generateCanvasImage(canvasName, dbTableName);
    }
  }, 60 * 1000);

  for (const [canvasName, dbTableName] of Object.entries(CANVASES)) {
    await generateCanvasImage(canvasName, dbTableName);
  }

  io.on('connection', (socket) => {
    // eslint-disable-next-line no-unused-vars
    socket.on('draw-pixel', async (pixelData) => {
      const { route } = socket.handshake.query;
      const canvasName = getCanvasNameFromRoute(route);
      if (canvasName && CANVASES[canvasName]) {
        //? logger.info(`Draw-pixel event received for ${canvasName}`);
        await generateCanvasImage(canvasName, CANVASES[canvasName]);
      }
    });
  });
}

function getCanvasNameFromRoute(route) {
  switch (route) {
    case '/canvas-1': return 'canvas1';
    case '/canvas-2': return 'canvas2';
    case '/canvas-3': return 'canvas3';
    default: return null;
  }
}

router.get('/api/images/server-:serverNumber', async (req, res) => {
  const { serverNumber } = req.params;
  const canvasName = `canvas${serverNumber}`;

  if (!CANVASES[canvasName]) {
    return res.status(404).json({ success: false, message: 'Invalid server number' });
  }

  try {
    const subDir = path.join(BASE_IMAGE_DIR, canvasName);
    const files = await fs.readdir(subDir);
    const canvasFiles = files.filter(file => file.startsWith(canvasName)).sort().reverse();
    if (canvasFiles.length === 0) {
      logger.warn(`No regular images found for ${canvasName}`);
      return res.status(404).json({ success: false, message: 'No image found for this canvas' });
    }

    const latestImage = canvasFiles[0];
    const filepath = path.join(subDir, latestImage);
    //? logger.info(`Serving regular image: ${filepath}`);
    res.sendFile(filepath);
  } catch (err) {
    logger.error(`Error serving regular image for ${canvasName}:`, err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/api/images/server-:serverNumber/url', async (req, res) => {
  const { serverNumber } = req.params;
  const canvasName = `canvas${serverNumber}`;

  if (!CANVASES[canvasName]) {
    return res.status(404).json({ success: false, message: 'Invalid server number' });
  }

  try {
    const subDir = path.join(BASE_IMAGE_DIR, canvasName);
    const files = await fs.readdir(subDir);
    const canvasFiles = files.filter(file => file.startsWith(canvasName)).sort().reverse();
    if (canvasFiles.length === 0) {
      //? logger.warn(`No regular images found for ${canvasName}`);
      return res.status(404).json({ success: false, message: 'No image found for this canvas' });
    }

    const latestImage = canvasFiles[0];
    const imageUrl = `/images/${canvasName}/${latestImage}`;
    //? logger.info(`Returning regular image URL for ${canvasName}: ${imageUrl}`);
    res.json({ success: true, imageUrl });
  } catch (err) {
    logger.error(`Error fetching regular image URL for ${canvasName}:`, err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = { startImageGeneration, router };
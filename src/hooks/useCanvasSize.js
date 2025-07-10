import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  S1_GRID_WIDTH,
  S1_GRID_HEIGHT,
  S2_GRID_WIDTH,
  S2_GRID_HEIGHT,
  S3_GRID_WIDTH,
  S3_GRID_HEIGHT,
  SINGLEPLAYER_GRID_WIDTH,
  SINGLEPLAYER_GRID_HEIGHT,
} from '../utils/config/canvas-size';

export const useCanvasSize = () => {
  const location = useLocation();
  
  return useMemo(() => {
    if (location.pathname.startsWith('/canvas-1')) {
      return { width: S1_GRID_WIDTH, height: S1_GRID_HEIGHT };
    }
    if (location.pathname.startsWith('/canvas-2')) {
      return { width: S2_GRID_WIDTH, height: S2_GRID_HEIGHT };
    }
    if (location.pathname.startsWith('/canvas-3')) {
      return { width: S3_GRID_WIDTH, height: S3_GRID_HEIGHT };
    }
    if (location.pathname.startsWith('/single-player-game')) {
      return {
        width: SINGLEPLAYER_GRID_WIDTH,
        height: SINGLEPLAYER_GRID_HEIGHT,
      };
    }
    throw new Error('Invalid server path');
  }, [location.pathname]);
};
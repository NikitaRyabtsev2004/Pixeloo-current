import React, { useState, useEffect } from 'react';

const ImageModal = ({ imageUrl, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 400, height: 300 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [opacity, setOpacity] = useState(1);

  const handleMouseDown = (e) => {
    if (!e.target.classList.contains('slider-opacity')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
    if (isResizing) {
      const newWidth = e.clientX - position.x;
      const newHeight = e.clientY - position.y;
      if (newWidth > 200 && newHeight > 150) {
        setSize({ width: newWidth, height: newHeight });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setPosition({ x: 0, y: 0 });
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    } else {
      setSize({ width: 400, height: 300 });
    }
  };

  const handleOpacityChange = (e) => {
    setOpacity(parseFloat(e.target.value));
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (isResizing) {
        const newWidth = e.clientX - position.x;
        const newHeight = e.clientY - position.y;
        if (newWidth > 200 && newHeight > 150) {
          setSize({ width: newWidth, height: newHeight });
        }
      }
    };

    const handleGlobalMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isResizing, position]);

  return (
    <div
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        width: size.width,
        height: size.height,
        zIndex: 1000,
        overflow: 'hidden',
        border:'1px solid black',
        pointerEvents: 'none',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          backgroundColor: '#f1f1f1',
          cursor: 'move',
          pointerEvents: 'auto',
        }}
        onMouseDown={handleMouseDown}
      >
        <div>
          <button onClick={toggleFullscreen}>
            {isFullscreen ? 'Свернуть' : 'На весь экран'}
          </button>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={opacity}
          onChange={handleOpacityChange}
          className="slider-opacity"
          style={{ width: '100px', margin: '0 10px' }}
        />
        <button onClick={onClose} style={{ cursor: 'pointer' }}>
          ✖
        </button>
      </div>

      {/* Изображение с прозрачностью */}
      <img
        src={imageUrl}
        alt="Uploaded"
        style={{
          width: '100%',
          height: `calc(100% - 50px)`,
          objectFit: 'contain',
          opacity: opacity,
          pointerEvents: 'none',
        }}
      />

      {/* Уголок для изменения размера */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '20px',
          height: '20px',
          cursor: 'se-resize',
          opacity: '75%',
          backgroundColor: '#ccc',
          pointerEvents: 'auto',
          
        }}
        onMouseDown={(e) => {
          e.stopPropagation(); 
          setIsResizing(true);
        }}
      />
    </div>
  );
};

export default ImageModal;

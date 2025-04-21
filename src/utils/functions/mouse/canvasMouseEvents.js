export const handleCanvasClick = (e, isDragging, handlePixelClick) => {
  if (e.button === 0 && !isDragging) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handlePixelClick(x, y);
  }
};

export const handleMouseDown = (e, setIsDragging, setDragStart) => {
  if (e.button === 0 || e.button === 1 || e.button === 2) {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }
};

export const handleMouseUp = (e, setIsDragging) => {
  if (e.button === 0 || e.button === 1 || e.button === 2) {
    setIsDragging(false);
  }
};

export const handleMouseMove = (
  e,
  isDragging,
  dragStart,
  offset,
  setOffset,
  setDragStart,
  setHoveredCoordinates,
  canvasRef,
  PIXEL_SIZE,
  scale,
  pixels,
  socket,
  setHoveredUsername
) => {
  if (isDragging) {
    const newOffsetX = offset.x + (e.clientX - dragStart.x);
    const newOffsetY = offset.y + (e.clientY - dragStart.y);

    setOffset({ x: newOffsetX, y: newOffsetY });
    setDragStart({ x: e.clientX, y: e.clientY });
    return;
  }

  // Ensure that canvasRef.current is defined before accessing getBoundingClientRect
  const canvas = canvasRef.current;
  if (!canvas) return; // If the canvas reference is not set, return early

  const rect = canvas.getBoundingClientRect();
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
  } else {
    setHoveredUsername(null);
  }
};

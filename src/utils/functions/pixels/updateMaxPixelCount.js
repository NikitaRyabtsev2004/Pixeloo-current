export const handleUpdateMaxPixelCount = (newMaxPixelCount, socket) => {
  if (!socket) {
    return;
  }

  socket.emit('update-max-pixel-count', { newMaxPixelCount }, (response) => {
    if (response.success) {
      window.location.reload();
    }
  });
};

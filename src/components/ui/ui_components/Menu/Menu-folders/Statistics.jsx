import React, { useEffect, useState } from 'react';

const Statistics = ({ onBack, socket }) => {
  const [totalAmount, setTotalAmount] = useState();
  const [totalAmountCanvas1, setTotalAmountCanvas1] = useState();
  const [totalAmountCanvas2, setTotalAmountCanvas2] = useState();
  const [totalAmountCanvas3, setTotalAmountCanvas3] = useState();

  useEffect(() => {
    if (!socket) return;

    const fetchTotalAmount = () => {
      socket.emit('requestTotalAmount');
    };

    const intervalTotalAmount = setInterval(fetchTotalAmount, 500);

    const updateTotalAmount = (data) => {
      setTotalAmount(data.placedPixels);
    };

    const updateTotalAmountCanvas1 = (data) => {
      setTotalAmountCanvas1(data.placedPixels);
    };

    const updateTotalAmountCanvas2 = (data) => {
        setTotalAmountCanvas2(data.placedPixels);
      };

      const updateTotalAmountCanvas3 = (data) => {
        setTotalAmountCanvas3(data.placedPixels);
      };

    socket.on('placed-pixels-update', updateTotalAmount);
    socket.on('placed-pixels-update-canvas-1', updateTotalAmountCanvas1);
    socket.on('placed-pixels-update-canvas-2', updateTotalAmountCanvas2);
    socket.on('placed-pixels-update-canvas-3', updateTotalAmountCanvas3);

    return () => {
      clearInterval(intervalTotalAmount);
      socket.off('placed-pixels-update', updateTotalAmount);
      socket.off('placed-pixels-update-canvas-1', updateTotalAmountCanvas1);
      socket.off('placed-pixels-update-canvas-2', updateTotalAmountCanvas2);
      socket.off('placed-pixels-update-canvas-3', updateTotalAmountCanvas3);
    };
  }, [socket]);

  return (
    <>
      <h3 className="Menu__logo">Statistics</h3>
      <div className="statistics">
        <div>Общее кол-во: {totalAmount}</div>
        <div>Canvas - 1: {totalAmountCanvas1}</div>
        <div>Canvas - 2: {totalAmountCanvas2}</div>
        <div>Canvas - 3: {totalAmountCanvas3}</div>
      </div>
      <div className="menu__switch__buttons">
        <button onClick={onBack}>Назад</button>
      </div>
    </>
  );
};

export default Statistics;

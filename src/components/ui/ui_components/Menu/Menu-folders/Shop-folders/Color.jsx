import React, { useState } from 'react';
import { useNotifications } from '../../../../../../utils/helpers/notifications';

const Color = ({ setIsState, coins, socket }) => {
  const [selectedColor, setSelectedColor] = useState('#000000');
  const {
    showColorPurchaseSuccess,
    showColorPurchaseError,
    showInsufficientCoinsNotification,
    showColorPurchaseConfirmation,
  } = useNotifications();

  const handleColorChange = (e) => {
    setSelectedColor(e.target.value);
  };

  const handlePurchase = () => {
    if (coins < 200) {
      showInsufficientCoinsNotification();
      return;
    }

    showColorPurchaseConfirmation(selectedColor, () => {
      socket.emit('purchase-color', { color: selectedColor }, (response) => {
        if (response.success) {
          showColorPurchaseSuccess(selectedColor);
        } else {
          showColorPurchaseError(response.message);
        }
      });
    });
  };

  return (
    <div className="color-container">
      <h4 style={{margin:"5px 0"}}>Покупка нового цвета</h4>
      <div className="color-input-group">
        <label htmlFor="colorPicker">Выберите цвет:</label>
        <input
        style={{width:"80%", height:"40px", margin:"0 10px", }}
          type="color"
          id="colorPicker"
          value={selectedColor}
          onChange={handleColorChange}
        />
        <p style={{margin:"5px 0"}}>Выбранный цвет: {selectedColor}</p>
      </div>
      <button 
        className='ColorBuy-button'
        style={{background:`${selectedColor}`}} 
        onClick={handlePurchase}
        >
        <span style={{color:`${selectedColor}`, filter:"invert(1)"}}>Купить за 200 монет</span>
      </button>
      <div className="menu__switch__buttons">
        <button onClick={() => setIsState(0)}>Главная</button>
      </div>
    </div>
  );
};

export default Color;
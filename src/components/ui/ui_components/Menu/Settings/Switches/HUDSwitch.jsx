import React, { useState } from 'react';
import { playSound } from '../../../../../../utils/functions/sounds/sounds';
import { useSettings } from '../../../../../../hooks/useSettings';

const HUDSwitch = () => {
  const [isChecked, setIsChecked] = useState(() => {
    return localStorage.getItem('HUD') === 'true';
  });
  const { isHudOpen, isSoundsOn } = useSettings();

  const handleCheckboxClick = () => {
    setIsChecked((prev) => {
      playSound(0.5, 'note-3.mp3', isSoundsOn);
      const newValue = !prev;
      localStorage.setItem('HUD', newValue.toString());
      window.dispatchEvent(new Event('storage')); // Принудительно обновляем `ServersMenu`
      return newValue;
    });
  };

  return (
    <div>
      <button
        onClick={handleCheckboxClick}
        style={{
          backgroundColor: isChecked ? '#e0f7fa' : '#fff',
        }}
      >
        <span>{isChecked ? '✓' : ''}</span>
        <span>HUD</span>
      </button>
    </div>
  );
};

export default HUDSwitch;

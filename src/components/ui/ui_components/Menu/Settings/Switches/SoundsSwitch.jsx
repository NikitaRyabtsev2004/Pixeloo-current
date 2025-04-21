import React, { useEffect, useState } from 'react';
import { playSound } from '../../../../../../utils/functions/sounds/sounds';
import { useSettings } from '../../../../../../hooks/useSettings';

const SoundsSwitch = () => {
  const [isChecked, setIsChecked] = useState(() => {
    const savedValue = localStorage.getItem('sounds');
    return savedValue ? savedValue === 'true' : true;
  });
  const { isHudOpen, isSoundsOn } = useSettings();

  const handleCheckboxClick = () => {
    setIsChecked((prev) => {
      playSound(0.5, 'note-3.mp3', isSoundsOn);
      const newValue = !prev;
      localStorage.setItem('sounds', newValue.toString());
      window.dispatchEvent(new Event('storage'));
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
        <span>Sounds</span>
      </button>
    </div>
  );
};

export default SoundsSwitch;

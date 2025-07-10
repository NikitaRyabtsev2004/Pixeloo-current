import React, { useState } from 'react';
import { useSettings } from '../../../../../../hooks/useSettings';
import { playSound } from '../../../../../../utils/functions/sounds/sounds';

const IntroSwitch = () => {
  const [isChecked, setIsChecked] = useState(() => {
    const savedValue = localStorage.getItem('intro');
    return savedValue ? savedValue === 'true' : true;
  });
  const { isSoundsOn } = useSettings();

  const handleCheckboxClick = () => {
    setIsChecked((prev) => {
      playSound(0.5, 'note-3.mp3', isSoundsOn);
      const newValue = !prev;
      localStorage.setItem('intro', newValue.toString());
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
        <span>Intro</span>
      </button>
    </div>
  );
};

export default IntroSwitch;

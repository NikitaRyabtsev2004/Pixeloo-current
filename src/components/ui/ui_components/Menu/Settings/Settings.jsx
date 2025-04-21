import React, { useState } from 'react';
import IntroSwitch from './Switches/IntroSwitch';
import HUDSwitch from './Switches/HUDSwitch';
import SoundsSwitch from './Switches/SoundsSwitch';
import { useSettings } from '../../../../../hooks/useSettings';
import { playSound } from '../../../../../utils/functions/sounds/sounds';

const Settings = ({ onBack }) => {
  const [sliderOpacity, setSliderOpacity] = useState(() => {
    const savedValue = localStorage.getItem('HUDOpacity');
    return savedValue !== null ? parseInt(savedValue, 10) : 50;
  });

  const [sliderVolume, setSliderVolume] = useState(() => {
    const savedValue = localStorage.getItem('volume');
    return savedValue !== null ? parseInt(savedValue, 10) : 50;
  });

  const { isHudOpen, isSoundsOn } = useSettings();

  const handleSliderOpacityChange = (event) => {
    const newValue = Math.min(Math.max(event.target.value, 20), 100);
    setSliderOpacity(newValue);
    playSound(0.2, 'scroll.mp3', isSoundsOn)
    localStorage.setItem('HUDOpacity', newValue.toString());
  };

  const handleSliderVolumeChange = (event) => {
    const newValue = Math.min(Math.max(event.target.value, 1), 100);
    setSliderVolume(newValue);
    playSound(0.2, 'scroll.mp3', isSoundsOn)
    localStorage.setItem('volume', newValue.toString());
  };

  return (
    <>
      <h3 className="Menu__logo">Settings</h3>
      <div className="menu__switch__buttons">
        <IntroSwitch />
        <HUDSwitch />
        <SoundsSwitch />
        <div className="slider-container">
          <h4>Прозрачность HUD</h4>
          <input
            type="range"
            min="20"
            max="100"
            value={sliderOpacity}
            onChange={handleSliderOpacityChange}
            className="slider-opacity"
          />
          <div
            className="slider-value-1"
            style={{ left: `${sliderOpacity}% ` }}
          >
            {sliderOpacity}
          </div>
          <input
            type="range"
            min="20"
            max="100"
            value={sliderVolume}
            onChange={handleSliderVolumeChange}
            className="slider-volume"
          />
          <div className="slider-value-2" style={{ left: `${sliderVolume}% ` }}>
            {sliderVolume}
          </div>
          <h4>Громкость</h4>
        </div>
        <button onClick={onBack}>Назад</button>
      </div>
    </>
  );
};

export default Settings;

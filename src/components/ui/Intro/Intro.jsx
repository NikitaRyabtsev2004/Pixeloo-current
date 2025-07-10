import React, { useState, useEffect } from 'react';
import Square from './Square.jsx';
import IntroLetters from './IntroLetters.jsx';
import '../../../styles/PixelooIntro.css';
// import { playSound } from '../../../utils/functions/sounds/sounds.js';
// import { useSettings } from '../../../hooks/useSettings.js';

function Intro() {
  const [isBackgroundActive, setIsBackgroundActive] = useState(false);
  const [headerClass, setHeaderClass] = useState('intro');
  const [isFading, setIsFading] = useState(false);
  const [isDisplay, setIsDisplay] = useState(true);
  // const { isHudOpen, isSoundsOn } = useSettings();

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setHeaderClass('intro fade');
      setIsBackgroundActive(true);
      const backgroundTimer = setTimeout(() => {
        setIsFading(true);
        const fadeOutTimer = setTimeout(() => {
          setIsBackgroundActive(false);
          setIsDisplay(false);
        }, 1000);

        return () => clearTimeout(fadeOutTimer);
      }, 4000);

      return () => clearTimeout(backgroundTimer);
    }, 2000);

    return () => clearTimeout(fadeTimer);
  }, []);

  return (
    <>
      {isDisplay ? (
        <div className={`Intro ${isFading ? 'fade-out' : ''}`}>
          <div style={{ overflow: 'hidden' }} className={headerClass}>
            <div className="shape__square">
              <Square />
            </div>
            {isBackgroundActive && (
              <IntroLetters style={{ overflow: 'hidden' }} />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

export default Intro;

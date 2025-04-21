import React, { useEffect, useState } from 'react';
import { playSound } from '../../../../utils/functions/sounds/sounds';
import { useSettings } from '../../../../hooks/useSettings';
import { Achievement } from '../../../modal/AchievementModal';
import { useSelector } from 'react-redux';

const AchievementShow = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isSoundsOn } = useSettings();
  const lastAchieved = useSelector((state) => state.achievements.lastAchieved);

  useEffect(() => {
    if (lastAchieved) {
      const storedAchievements = JSON.parse(localStorage.getItem('achieved') || '[]');

      if (storedAchievements.includes(lastAchieved.field)) {
        return;
      }

      setIsOpen(true);
      playSound(1, 'achive.mp3', isSoundsOn);

      const timeout = setTimeout(() => {
        let opacity = 1;
        const interval = setInterval(() => {
          opacity -= 0.01;
          if (opacity <= 0) {
            clearInterval(interval);
            setIsOpen(false);
            storedAchievements.push(lastAchieved.field);
            localStorage.setItem('achieved', JSON.stringify(storedAchievements));
          } else {
            const achievementElement = document.querySelector('.Achivement__container');
            if (achievementElement) {
              achievementElement.style.opacity = opacity;
            }
          }
        }, 30);
      }, 4000);

      return () => clearTimeout(timeout);
    }
  }, [lastAchieved, isSoundsOn]);


  return (
    <div>
      {isOpen && lastAchieved ? <Achievement lastAchieved={lastAchieved} /> : null}
    </div>
  );
};

export default AchievementShow;

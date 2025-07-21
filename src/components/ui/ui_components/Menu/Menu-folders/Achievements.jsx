import React, { useState } from 'react';
import { achievementDataConfig } from '../../../../../utils/helpers/constants';
import { useSelector } from 'react-redux';

const Achievements = ({ onBack }) => {
  const achievements = useSelector(state => state.achievements.data);
  const achievementData = achievementDataConfig(achievements);
  const [hoveredAchievements, setHoveredAchievements] = useState({});

  const handleMouseEnter = (id) => {
    setHoveredAchievements(prev => ({ ...prev, [id]: true }));
  };

  const handleMouseLeave = (id) => {
    setHoveredAchievements(prev => ({ ...prev, [id]: false }));
  };

  return (
    <div>
      <h3 className="Menu__logo">Achievements</h3>
      <div>
        {achievements ? (
          <div className="Achievements-user__container">
            {achievementData.map((achievement) => (
              <div
                key={achievement.id}
                style={{ background: achievement.background }}
                className="Achievement-user"
              >
                <div
                  style={
                    achievement.value === 0
                      ? {
                          backdropFilter: 'blur(1.7px)',
                          background: hoveredAchievements[achievement.id] ? '#98000078' : '#4444449f',
                        }
                      : {}
                  }
                  className="Achievement-user__blur"
                />
                <div 
                  className="Achievement-user__info" 
                  style={{
                    ...(achievement.value === 0 ? {
                      transform: 'none',
                      overflow: 'hidden'
                        } : {}),
                      position: 'relative',
                
                        }}
                  onMouseEnter={() => handleMouseEnter(achievement.id)}
                  onMouseLeave={() => handleMouseLeave(achievement.id)}
                  onTouchStart={() => handleMouseEnter(achievement.id)}
                  onTouchEnd={() => handleMouseLeave(achievement.id)}
                >
                  <img style={
                    achievement.value === 0
                      ? {
                          filter: 'blur(4px)',
                          transform:"none"
                        }
                      : {}
                  }src={achievement.image} alt={achievement.text} />
                  <div className="Achievements-user__text">
                    {achievement.text}: {achievement.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="menu__switch__buttons">
        <button onClick={onBack}>Назад</button>
      </div>
    </div>
  );
};

export default Achievements;
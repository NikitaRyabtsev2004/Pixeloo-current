import React from 'react';
import { achievementDataConfig } from '../../../../../utils/helpers/constants';
import { useSelector } from 'react-redux';

const Achievements = ({ onBack }) => {
  const achievements = useSelector(state => state.achievements.data);
  const achievementData = achievementDataConfig(achievements);
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
                          background: '#4444449f',
                        }
                      : {}
                  }
                  className="Achievement-user__blur"
                />
                <div className="Achievement-user__info">
                  <img src={achievement.image} alt={achievement.text} />
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

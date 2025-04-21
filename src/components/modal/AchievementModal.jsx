import React from 'react';
import { useSelector } from 'react-redux';
import { achievementDataConfig } from '../../utils/helpers/constants';

export const Achievement = ({ lastAchieved }) => {
  const achievements = useSelector((state) => state.achievements.data);
  const achievementData = achievementDataConfig(achievements);

  const achievementNum = lastAchieved ? lastAchieved.id - 1 : null;

  if (achievementNum === null) {
    return null;
  }

  return (
    <div className="Achivement__container">
      <div
        style={{ background: achievementData[achievementNum].background }}
        className="Achivement"
      >
        <img src={achievementData[achievementNum].image} alt="Достижение" />
        <div
          style={{
            background: 'black',
            color: achievementData[achievementNum].background,
          }}
          className="Achivement__text"
        >
          <h3>Получено достижение:</h3>
          <h4>{achievementData[achievementNum].text}</h4>
        </div>
      </div>
    </div>
  );
};

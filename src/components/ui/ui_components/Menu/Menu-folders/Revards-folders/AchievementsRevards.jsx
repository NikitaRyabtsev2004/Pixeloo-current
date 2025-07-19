import React, { useState, useEffect } from 'react';
import { useSettings } from '../../../../../../hooks/useSettings';
import { useNotifications } from '../../../../../../utils/helpers/notifications';

const AchievementsRevards = ({ onBack, socket }) => {
  const { isSoundsOn } = useSettings();
  const { showAchievementRewardSuccess, showRevardsError } = useNotifications();
  const [achievements, setAchievements] = useState({
    firstAchive: { completed: 0, claimed: 0, coins: 50 },
    secondAchive: { completed: 0, claimed: 0, coins: 150 },
    thirdAchive: { completed: 0, claimed: 0, coins: 400 },
    fourthAchive: { completed: 0, claimed: 0, coins: 1000 },
    fifthAchive: { completed: 0, claimed: 0, coins: 1000 },
  });

  useEffect(() => {
    if (socket) {
      socket.emit('get-achievements-user-data');
      socket.on('achievements-user-data', (data) => {
        setAchievements({
          firstAchive: {
            completed: data.firstAchive || 0,
            claimed: data.firstAchiveClaimed || 0,
            coins: 50,
          },
          secondAchive: {
            completed: data.secondAchive || 0,
            claimed: data.secondAchiveClaimed || 0,
            coins: 150,
          },
          thirdAchive: {
            completed: data.thirdAchive || 0,
            claimed: data.thirdAchiveClaimed || 0,
            coins: 400,
          },
          fourthAchive: {
            completed: data.fourthAchive || 0,
            claimed: data.fourthAchiveClaimed || 0,
            coins: 1000,
          },
          fifthAchive: {
            completed: data.fifthAchive || 0,
            claimed: data.fifthAchiveClaimed || 0,
            coins: 1000,
          },
        });
      });
    }
    return () => {
      if (socket) {
        socket.off('achievements-user-data');
        socket.off('error');
      }
    };
  }, [socket]);

  const achievementLabels = {
    firstAchive: 'Первый пиксель (1 пиксель)',
    secondAchive: 'Новичок (101 пикселей)',
    thirdAchive: 'Художник (1000 пикселей)',
    fourthAchive: 'Мастер (10000 пикселей)',
    fifthAchive: 'Колорист (50 цветов)',
  };

  const handleClaimReward = (achievementKey, coins) => {
    if (
      socket &&
      achievements[achievementKey].completed &&
      !achievements[achievementKey].claimed
    ) {
      socket.emit(
        'claim-achievement-reward',
        { achievement: achievementKey, coins },
        (response) => {
          if (response.success) {
            setAchievements((prev) => ({
              ...prev,
              [achievementKey]: { ...prev[achievementKey], claimed: 1 },
            }));
            showAchievementRewardSuccess(
              coins,
              achievementLabels[achievementKey]
            );
          } else {
            showRevardsError(response.message);
          }
        }
      );
    }
  };

  return (
    <div className="achievements-rewards">
      <h4 className="Menu__logo">Награды за достижения</h4>
      <div className="rewards-list">
        {Object.entries(achievements).map(
          ([key, { completed, claimed, coins }]) => (
            <div
              key={key}
              className={`reward-item ${completed ? 'completed' : ''} ${claimed ? 'claimed' : ''}`}
            >
              <div style={{display:"flex"}}>
                <span>{achievementLabels[key]}</span>
                <span>{coins} монет</span>
              </div>

              {!claimed && (
                <button
                  className={`claim-button ${completed ? 'active' : 'inactive'}`}
                  onClick={() => handleClaimReward(key, coins)}
                  disabled={!completed}
                >
                  Забрать
                </button>
              )}
            </div>
          )
        )}
      </div>
      <div className="menu__switch__buttons">
        <button onClick={onBack}>Отмена</button>
      </div>
    </div>
  );
};

export default AchievementsRevards;

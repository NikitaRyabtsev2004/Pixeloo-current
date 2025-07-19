import React, { useState, useEffect } from 'react';
import { useSettings } from '../../../../../../hooks/useSettings';
import { useNotifications } from '../../../../../../utils/helpers/notifications';

const DailyRevards = ({ onBack, socket }) => {
  const { isSoundsOn } = useSettings();
  const { showDailyRewardSuccess, showRevardsError } = useNotifications();
  const [dailyRewards, setDailyRewards] = useState({
    pixelReward: {
      completed: false,
      claimed: false,
      coins: 150,
      lastClaimed: null,
    },
    colorReward: {
      completed: false,
      claimed: false,
      coins: 50,
      lastClaimed: null,
    },
  });

  useEffect(() => {
    if (socket) {
      socket.emit('get-daily-rewards');
      socket.on('daily-rewards-data', (data) => {
        setDailyRewards({
          pixelReward: {
            completed: data.pixelRewardCompleted,
            claimed: data.pixelRewardClaimed,
            coins: 150,
            lastClaimed: data.pixelRewardLastClaimed,
          },
          colorReward: {
            completed: data.colorRewardCompleted,
            claimed: data.colorRewardClaimed,
            coins: 50,
            lastClaimed: data.colorRewardLastClaimed,
          },
        });
      });
      socket.on('daily-rewards-reset', () => {
        socket.emit('get-daily-rewards');
      });
    }
    return () => {
      if (socket) {
        socket.off('daily-rewards-data');
        socket.off('daily-rewards-reset');
      }
    };
  }, [socket]);

  const rewardLabels = {
    pixelReward: '300 пикселей на сетевых полях',
    colorReward: '8 разных цветов',
  };

  const handleClaimDailyReward = (rewardKey, coins) => {
    if (
      socket &&
      dailyRewards[rewardKey].completed &&
      !dailyRewards[rewardKey].claimed
    ) {
      socket.emit(
        'claim-daily-reward',
        { reward: rewardKey, coins },
        (response) => {
          if (response.success) {
            setDailyRewards((prev) => ({
              ...prev,
              [rewardKey]: { ...prev[rewardKey], claimed: true },
            }));
            showDailyRewardSuccess(coins, rewardLabels[rewardKey]);
          } else {
            showRevardsError(response.message);
          }
        }
      );
    }
  };

  return (
    <div className="daily-rewards">
      <h4 className="Menu__logo">Ежедневные награды</h4>
      <div className="rewards-list">
        <div
          className={`reward-item ${dailyRewards.pixelReward.completed ? 'completed' : ''} ${
            dailyRewards.pixelReward.claimed ? 'claimed' : ''
          }`}
        >
          <div style={{ display: 'flex' }}>
            <span>300 пикселей на сетевых полях</span>
            <span>150 монет</span>
          </div>

          {!dailyRewards.pixelReward.claimed && (
            <button
              className={`claim-button ${dailyRewards.pixelReward.completed ? 'active' : 'inactive'}`}
              onClick={() => handleClaimDailyReward('pixelReward', 150)}
              disabled={!dailyRewards.pixelReward.completed}
            >
              Забрать
            </button>
          )}
        </div>
        <div
          className={`reward-item ${dailyRewards.colorReward.completed ? 'completed' : ''} ${
            dailyRewards.colorReward.claimed ? 'claimed' : ''
          }`}
        >
          <div style={{ display: 'flex' }}>
            <span>8 разных цветов</span>
            <span>(50 монет)</span>
          </div>

          {!dailyRewards.colorReward.claimed && (
            <button
              className={`claim-button ${dailyRewards.colorReward.completed ? 'active' : 'inactive'}`}
              onClick={() => handleClaimDailyReward('colorReward', 50)}
              disabled={!dailyRewards.colorReward.completed}
            >
              Забрать
            </button>
          )}
        </div>
      </div>
      <div className="menu__switch__buttons">
        <button onClick={onBack}>Отмена</button>
      </div>
    </div>
  );
};

export default DailyRevards;
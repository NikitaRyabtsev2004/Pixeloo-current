import React, { useState } from 'react';
import { back, to } from '../../buttons/MenuButton';
import { useSettings } from '../../../../../hooks/useSettings';
import AchievementsRevards from './Revards-folders/AchievementsRevards';
import DailyRevards from './Revards-folders/DailyRevards';

const Revards = ({ onBack, socket }) => {
  const [isState, setIsState] = useState(0);
  const { isSoundsOn } = useSettings();
  return (
    <div>
      <h3 className="Menu__logo">Revards</h3>
      {isState === 0 ? (
        <>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <button onClick={() => to(setIsState, 1, isSoundsOn)}>
              Награды за достижения
            </button>
            <button onClick={() => to(setIsState, 2, isSoundsOn)}>
              Ежедневные награды
            </button>
          </div>
        </>
      ) : isState === 1 ? (
        <>
          <AchievementsRevards
            onBack={() => back(setIsState, isSoundsOn)}
            socket={socket}
          />
        </>
      ) : isState === 2 ? (
        <>
          <DailyRevards
            onBack={() => back(setIsState, isSoundsOn)}
            socket={socket}
          />
        </>
      ) : null}
      <div className="menu__switch__buttons">
        <button onClick={onBack}>Назад</button>
      </div>
    </div>
  );
};

export default Revards;

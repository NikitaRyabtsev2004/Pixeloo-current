import React, { useState } from 'react';
import Settings from './Settings/Settings';
import Statistics from './Menu-folders/Statistics';
import { back, to } from '../buttons/MenuButton';
import { useSettings } from '../../../../hooks/useSettings';
import Shop from './Menu-folders/Shop';
import Revards from './Menu-folders/Revards';
import Achievements from './Menu-folders/Achievements';
import Account from './Menu-folders/Account';

const Menu = ({ socket }) => {
  const [isState, setIsState] = useState(0);
  const { isHudOpen, isSoundsOn } = useSettings();

  return (
    <div>
      {isState === 0 ? (
        <>
          <div>
            <h3 className="Menu__logo">Menu</h3>
            <div className="menu__switch__buttons">
              <button onClick={() => to(setIsState, 1, isSoundsOn)}>
                Настройки
              </button>
              <button onClick={() => to(setIsState, 2, isSoundsOn)}>
                Статистика
              </button>
              <button onClick={() => to(setIsState, 3, isSoundsOn)}>
                Магазин
              </button>
              <button onClick={() => to(setIsState, 4, isSoundsOn)}>
                Награды
              </button>
              <button onClick={() => to(setIsState, 5, isSoundsOn)}>
                Достижения
              </button>
              <button onClick={() => to(setIsState, 6, isSoundsOn)}>
                Аккаунт
              </button>
            </div>
          </div>
        </>
      ) : isState === 1 ? (
        <>
          <Settings onBack={() => back(setIsState, isSoundsOn)} />
        </>
      ) : isState === 2 ? (
        <>
          <Statistics
            onBack={() => back(setIsState, isSoundsOn)}
            socket={socket}
          />
        </>
      ) : isState === 3 ? (
        <>
          <Shop onBack={() => back(setIsState, isSoundsOn)} />
        </>
      ) : isState === 4 ? (
        <>
          <Revards onBack={() => back(setIsState, isSoundsOn)} />
        </>
      ) : isState === 5 ? (
        <>
          <Achievements
            onBack={() => back(setIsState, isSoundsOn)}
            socket={socket}
          />
        </>
      ) : isState === 6 ? (
        <>
          <Account
            onBack={() => back(setIsState, isSoundsOn)}
            socket={socket}
          />
        </>
      ) : null}
    </div>
  );
};

export default Menu;

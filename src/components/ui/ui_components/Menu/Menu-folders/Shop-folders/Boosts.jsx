import React from 'react';

const Boosts = ({ boosts, activeBoost, handlePurchase, setIsState }) => {
  return (
    <>
      <div className="shop-container">
        <div className="boosts-grid">
          {boosts.map((boost) => (
            <div
              key={boost.name}
              className={`boost-card ${activeBoost && activeBoost.name === boost.name ? 'active' : ''}`}
            >
              <h4>{boost.name}</h4>
              <p>Цена: {boost.cost} coins</p>
              <p>Время обновления PX: {boost.updateTime}s</p>
              <p>Время действия: {boost.duration / 3600}h</p>
              <button
                onClick={() => handlePurchase(boost)}
                disabled={activeBoost && activeBoost.name === boost.name}
              >
                {activeBoost && activeBoost.name === boost.name
                  ? 'Active'
                  : 'Buy'}
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="menu__switch__buttons">
        <button onClick={() => setIsState(0)}>Главная</button>
      </div>
    </>
  );
};

export default Boosts;

import React from 'react';

const Shop = ({ onBack }) => {
  return (
    <div>
      <h3 className="Menu__logo">Shop</h3>

      <div className="menu__switch__buttons">
        <button onClick={onBack}>Назад</button>
      </div>
    </div>
  );
};

export default Shop;

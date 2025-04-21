import React from 'react';

const Revards = ({ onBack }) => {
  return (
    <div>
      <h3 className="Menu__logo">Revards</h3>

      <div className="menu__switch__buttons">
        <button onClick={onBack}>Назад</button>
      </div>
    </div>
  );
};

export default Revards;

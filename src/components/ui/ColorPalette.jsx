import React from 'react';
import { colors } from '../../utils/helpers/constants';
import PropTypes from 'prop-types';

export const ColorPalette = ({ selectedColor, setSelectedColor }) => {
  const handleColorSelect = (color) => {
    setSelectedColor(color);
  };

  return (
    <>
      <div className="colors__pallete">
        {colors.map((color, index) => (
          <div
            className="color__container"
            key={index}
            onClick={() => handleColorSelect(color)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleColorSelect(color);
              }
            }}
            role="button"
            tabIndex={0}
            style={{
              backgroundColor: color,
              border:
                color === selectedColor ? '2px solid black' : '2px solid #ddd',
            }}
          />
        ))}
        <input
          className="color__selector"
          type="color"
          value={selectedColor}
          onChange={(e) => setSelectedColor(e.target.value)}
        />
      </div>
    </>
  );
};

ColorPalette.propTypes = {
  selectedColor: PropTypes.string.isRequired,
  setSelectedColor: PropTypes.func.isRequired,
};

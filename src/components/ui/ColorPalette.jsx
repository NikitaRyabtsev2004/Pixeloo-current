import React, { useState } from 'react';
import PropTypes from 'prop-types';

export const ColorPalette = ({
  selectedColor,
  setSelectedColor,
  inputColor,
  userColors,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const visibleColors = userColors.slice(0, 9);
  const dropdownColors = userColors.slice(9);

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    setShowDropdown(false);
  };

  return (
    <div className="colors__pallete__container">
      <div className="colors__pallete">
        {visibleColors.map((color, index) => (
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
              border: color === selectedColor ? '2px solid black' : '2px solid #ddd',
            }}
          />
        ))}
        
        {dropdownColors.length > 0 && (
          <div className="color-dropdown-container">
            <div
              className="color__container color-dropdown-toggle"
              onClick={() => setShowDropdown(!showDropdown)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setShowDropdown(!showDropdown);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <span>⋯</span>
              
              {showDropdown && (
                <div className="color-dropdown">
                  {dropdownColors.map((color, index) => (
                    <div
                      key={index + visibleColors.length}
                      className="color__container"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleColorSelect(color);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          handleColorSelect(color);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      style={{
                        backgroundColor: color,
                        border: color === selectedColor ? '2px solid black' : '2px solid #ddd',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {inputColor ? (
        <input
          className="color__selector"
          type="color"
          value={selectedColor}
          onChange={(e) => setSelectedColor(e.target.value)}
        />
      ) : (
        <p style={{ width: '50px', fontSize: '10px' }}>
            Палитра доступна в подписке
          </p>
      )}
    </div>
  );
};

ColorPalette.propTypes = {
  selectedColor: PropTypes.string.isRequired,
  setSelectedColor: PropTypes.func.isRequired,
  inputColor: PropTypes.bool,
  userColors: PropTypes.arrayOf(PropTypes.string),
};

ColorPalette.defaultProps = {
  inputColor: false,
  userColors: [],
};
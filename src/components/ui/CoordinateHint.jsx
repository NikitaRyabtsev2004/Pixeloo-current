import React from 'react';
import PropTypes from 'prop-types';

const CoordinateHint = ({
  hoveredCoordinates,
  hoveredUsername,
  hoveredPixelColor,
}) => (
  <div className="Coordinations__Container">
    <div className="Pixel-Username__Row">
      {hoveredUsername && (
        <div className="Pixel-Username__container">
          <p>Никнейм: {hoveredUsername}</p>
          <div style={{ display: 'flex', gap: '5px' }}>
            <p>Цвет: {hoveredPixelColor}</p>
            <div
              style={{
                backgroundColor: hoveredPixelColor,
                height: '15px',
                width: '15px',
              }}
            />
          </div>
        </div>
      )}
    </div>
    <div className="Coordinations">
      Координаты:
      <p>X: {hoveredCoordinates.x}</p>
      <p>Y: {hoveredCoordinates.y}</p>
    </div>
  </div>
);

CoordinateHint.propTypes = {
  hoveredCoordinates: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }).isRequired,
  hoveredUsername: PropTypes.string,
  hoveredPixelColor: PropTypes.string,
};

export default CoordinateHint;

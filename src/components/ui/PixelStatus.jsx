import React from 'react';
import PropTypes from 'prop-types';

export const PixelStatus = ({ canDraw, remainingTime, pixelCount }) => (
  <>
    <div className="ready-bar__container">
      <div
        className="ready-bar__lane"
        style={{
          width: `${canDraw ? 0 : (remainingTime / 250) * 100}%`,
        }}
      />
      <div className="ready-bar__row">
        {remainingTime > 0 ? `${remainingTime} ms` : 'Готово'}
      </div>
    </div>
    <div className="pixel-amount__container">
      <div className="pixel-amount__number">
        Количество: <div className="pixel-amount">{pixelCount}</div>
      </div>
      <div>1PX в [5]сек</div>
    </div>
  </>
);

PixelStatus.propTypes = {
  canDraw: PropTypes.bool.isRequired,
  remainingTime: PropTypes.number.isRequired,
  pixelCount: PropTypes.number.isRequired,
};
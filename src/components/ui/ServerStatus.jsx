import React from 'react';
import PropTypes from 'prop-types';
import TelegramButton from './ui_components/TelegramButton';
import { useSettings } from '../../hooks/useSettings';

export const ServerStatus = ({ serverNumber, status }) => {
  const { isHudOpen } = useSettings();

  return (
    <>
      {isHudOpen ? (
        <>
          <div>
            <p className="online_status">
              Статус сервера-{serverNumber}: {status === 'connecting' ? 'подключение...' : status}
            </p>
            {status === 'offline' && serverNumber !== 'single' && (
              <div className="status_alert">
                <p>
                  Техническое обслуживание. Пожалуйста, попробуйте позже или
                  перезагрузите страницу
                </p>
              </div>
            )}
          </div>
          <TelegramButton />
        </>
      ) : null}
    </>
  );
};

ServerStatus.propTypes = {
  serverNumber: PropTypes.string.isRequired,
  status: PropTypes.string,
};
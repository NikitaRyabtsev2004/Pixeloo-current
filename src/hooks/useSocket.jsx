// src/hooks/useSocket.jsx
import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import config from '../utils/config/config';

const useSocket = ({ isBattleMode, gameId, serverNumber, pathname }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    let serverUrl;
    if (isBattleMode) {
      // Предполагаем, что gameId имеет формат "b1_xxx"
      const serverId = gameId.split('_')[0] || 'b1';
      serverUrl = config[`serverUrl_${serverId}`];
    } else if (pathname === '/single-player-game') {
      serverUrl = config.singlePlayerServerUrl;
    } else {
      serverUrl = config[`serverUrl_${serverNumber}`];
    }

    const socketInstance = io(serverUrl, {
      auth: {
        token: localStorage.getItem('authToken'),
        uniqueIdentifier: localStorage.getItem('uniqueIdentifier'),
      },
    });

    socketInstance.on('connect', () => {
      console.log('Сокет успешно подключен к:', serverUrl);
    });
    socketInstance.on('connect_error', (error) => {
      console.error('Ошибка подключения сокета:', error);
    });
    socketInstance.on('disconnect', (reason) => {
      console.log('Сокет отключен:', reason);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [isBattleMode, gameId, serverNumber, pathname]);

  return socket;
};

export default useSocket;

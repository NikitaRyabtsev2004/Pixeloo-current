import { io } from 'socket.io-client';

let socket;

export const initSocket = (authToken, uniqueIdentifier, serverUrl) => {
  socket = io(serverUrl, {
    auth: {
      token: authToken,
      uniqueIdentifier,
    },
  });

  return socket;
};

export const getSocket = () => socket;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const GamePhoto = ({ players }) => {
  return (
    <div className="gamePhoto">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          style={{
            backgroundColor: index < players.length ? 'green' : 'red',
            width: '20px',
            height: '20px',
            display: 'inline-block',
            margin: '2px',
            textAlign: 'center',
            color: 'white',
          }}
        >
          P{index + 1}
        </div>
      ))}
    </div>
  );
};

GamePhoto.propTypes = {
  players: PropTypes.arrayOf(PropTypes.string).isRequired,
};

const BattleMenuModal = ({ onClose, socket }) => {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [joinedGameId, setJoinedGameId] = useState(null);
  const ownId = localStorage.getItem('uniqueIdentifier');

  useEffect(() => {
    socket.on('connect', () => {
      socket.emit('get-battle-games');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      alert('Не удалось подключиться к серверу');
    });

    socket.on('battle-games', (battleGames) => {
      setGames(Array.isArray(battleGames) ? battleGames : []);
    });

    socket.on('joined-game', (data) => {
      console.log('Joined game:', data);
      setJoinedGameId(data.gameId);
      setIsLoading(false);
      socket.emit('join-room', `game_${data.gameId}`);
      
      // ИСПРАВЛЕНО: если игра уже в режиме рисования, сразу перенаправляем
      if (data.status === 'drawing' && data.gameId) {
        navigate(`/battle/${data.gameId}`);
      }
    });

    socket.on('join-failed', (data) => {
      setIsLoading(false);
      alert(data.message);
    });

    // ИСПРАВЛЕНО: обновляем состояния игр в реальном времени
    socket.on('game-state', (data) => {
      console.log('Game state update:', data);
      setGames((prevGames) =>
        prevGames.map((game) =>
          game.id === data.gameId
            ? { 
                ...game, 
                players: data.players, 
                status: data.status, 
                countdown: data.countdown 
              }
            : game
        )
      );
      
      // ИСПРАВЛЕНО: если наша игра началась, перенаправляем
      if (data.status === 'drawing' && data.gameId === joinedGameId) {
        navigate(`/battle/${data.gameId}`);
      }
    });

    socket.on('startDrawing', (data) => {
      console.log('Start drawing event:', data);
      if (joinedGameId === data.gameId) {
        navigate(`/battle/${data.gameId}`);
      }
    });

    socket.on('error', (data) => {
      alert(data.message);
    });

    // ИСПРАВЛЕНО: присоединяемся к лобби для получения обновлений
    socket.emit('join-room', 'battle-lobby');
    socket.emit('get-battle-games');

    // ИСПРАВЛЕНО: регулярно запрашиваем обновления
    const updateInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('get-battle-games');
      }
    }, 2000);

    return () => {
      clearInterval(updateInterval);
      socket.off('connect');
      socket.off('connect_error');
      socket.off('battle-games');
      socket.off('joined-game');
      socket.off('join-failed');
      socket.off('game-state');
      socket.off('startDrawing');
      socket.off('error');
      socket.emit('leave-room', 'battle-lobby');
    };
  }, [socket, navigate, joinedGameId]);

  const handleJoinGame = (lobbyId) => {
    if (!socket?.connected) {
      alert('Нет соединения с сервером, попробуйте позже');
      return;
    }
    setIsLoading(true);
    console.log('Attempting to join game:', lobbyId);
    socket.emit('join-battle-game', { lobbyId });
  };

  const handleLeaveGame = (gameId) => {
    if (!socket?.connected) {
      alert('Нет соединения с сервером, попробуйте позже');
      return;
    }
    socket.emit('leave-battle-game', { gameId });
    socket.emit('leave-room', `game_${gameId}`);
    setJoinedGameId(null);
  };

  return (
    <div className="BattleMenuModal__container">
      <div className="BattleMenuModal__logo">
        <h1>Баттлы</h1>
        <div className="BattleMenuModal__close">
          <button onClick={onClose}>Закрыть</button>
        </div>
      </div>
      <div className="BattleMenuModal__content">
        <div className="BattleMenuModal__current-games__container">
          <h4>
            Текущие игры <p>{games.length} из 5 доступно</p>
          </h4>
          <div className="BattleMenuModal__current-games">
            {games
              .sort((a, b) => a.lobbyId.localeCompare(b.lobbyId))
              .map((game) => (
                <div key={game.id} className="BattleMenuModal__game">
                  <p>
                    Лобби {game.lobbyId} - Статус:{' '}
                    {game.status === 'waiting'
                      ? 'Ожидание'
                      : game.status === 'countdown'
                      ? `Начинается через ${game.countdown} сек`
                      : game.status === 'drawing'
                      ? 'Идёт игра'
                      : game.status === 'evaluation'
                      ? 'Голосование'
                      : 'Завершена'}
                  </p>
                  <GamePhoto players={game.players || []} />
                  {joinedGameId === game.id ? (
                    <>
                      <p>
                        {game.status === 'countdown'
                          ? `Игра начнётся через ${game.countdown} секунд`
                          : game.status === 'drawing'
                          ? 'Игра в процессе'
                          : game.status === 'evaluation'
                          ? 'Голосование'
                          : game.status === 'finished'
                          ? 'Игра завершена'
                          : 'Ожидание игроков...'}
                      </p>
                      <button onClick={() => handleLeaveGame(game.id)}>
                        Отключиться
                      </button>
                    </>
                  ) : (
                    // ИСПРАВЛЕНО: разрешаем вход во время countdown если есть место
                    (game.status === 'waiting' || game.status === 'countdown') && 
                    game.players.length < 8 && 
                    !game.players.includes(ownId) ? (
                      <button
                        onClick={() => handleJoinGame(game.lobbyId)}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Подключаемся...' : 'Подключиться'}
                      </button>
                    ) : (
                      <p>
                        {game.players.includes(ownId) 
                          ? 'Вы уже в этой игре' 
                          : game.players.length >= 8 
                          ? 'Игра заполнена' 
                          : 'Игра уже началась'}
                      </p>
                    )
                  )}
                </div>
              ))}
          </div>
        </div>
        <div className="BattleMenuModal__random-game__container">
          <h4>Случайная игра</h4>
          <button
            onClick={() => handleJoinGame('random')}
            disabled={isLoading}
          >
            {isLoading ? 'Подключаемся...' : 'Подключиться'}
          </button>
        </div>
      </div>
    </div>
  );
};

BattleMenuModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  socket: PropTypes.object.isRequired,
};

export default BattleMenuModal;

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
  const [countdown, setCountdown] = useState(null);
  const ownId = localStorage.getItem('uniqueIdentifier');
  
  useEffect(() => {
    if (!socket) return;
    socket.on('connect', () => {
      console.log('Socket connected with id:', socket.id);
    });
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });
    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('connect_error');
      }
    };
  }, [socket]);

  useEffect(() => {
    socket.on('startGame', (data) => {
      console.log('startGame received:', data);
      // Ждём подтверждения готовности игры
      socket.emit('check-game-ready', { gameId: data.gameId }, (response) => {
        if (response.ready) {
          navigate(`/battle/${data.gameId}`);
        } else {
          console.log('Игра ещё не готова, ожидание...');
        }
      });
    });
    return () => socket.off('startGame');
  }, [socket, navigate]);
  
  useEffect(() => {
    if (!ownId) {
      alert('Идентификатор пользователя не найден. Пожалуйста, войдите в систему.');
      navigate('/login');
      return;
    }

    // Функция регистрации обработчиков, в том числе startGame
    const registerSocketHandlers = () => {
      // При успешном подключении отправляем запросы
      const handleConnect = () => {
        socket.emit('join-battle-lobby');
        socket.emit('get-battle-games');
      };

      // Если сокет уже подключён – вызываем handleConnect сразу
      if (socket.connected) {
        handleConnect();
      } else {
        socket.on('connect', handleConnect);
      }

      socket.on('connect_error', (error) => {
        console.error('Ошибка подключения сокета:', error);
        alert('Не удалось подключиться к серверу');
      });

      socket.on('disconnect', (reason) => {
        console.log('Сокет отключен:', reason);
      });

      // Другие события
      socket.on('battle-games', (battleGames) => {
        setGames(Array.isArray(battleGames) ? battleGames : []);
      });

      socket.on('game-state', (data) => {
        console.log('Получено обновление game-state:', data);
        const { gameId, players, countdown, status } = data;
        setGames((prevGames) =>
          prevGames.map((game) =>
            game.id === gameId ? { ...game, players, status, countdown } : game
          )
        );
        if (joinedGameId === gameId) {
          setCountdown(countdown);
          setIsLoading(false);
        }
      });

      socket.on('joined-game', (data) => {
        setJoinedGameId(data.gameId);
        setIsLoading(false);
      
        // ВАЖНО: сообщаем серверу, в какой "route" мы находимся
        socket.emit('route', `/battle/${data.gameId}`);
      });

      socket.on('join-failed', (data) => {
        setIsLoading(false);
        alert(data.message);
      });
    };

    if (socket) {
      registerSocketHandlers();
    }
    
    // При размонтировании удаляем обработчики
    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('connect_error');
        socket.off('disconnect');
        socket.off('startGame');
        socket.off('battle-games');
        socket.off('game-state');
        socket.off('joined-game');
        socket.off('join-failed');
      }
    };
  }, [socket, navigate, onClose, ownId, joinedGameId]);

  const handleJoinGame = (gameId) => {
    if (!socket?.connected) {
      alert('Нет соединения с сервером, попробуйте позже');
      return;
    }
    setIsLoading(true);
    setGames((prevGames) =>
      prevGames.map((game) =>
        game.id === gameId && !game.players.includes(ownId)
          ? { ...game, players: [...game.players, ownId] }
          : game
      )
    );
    setJoinedGameId(gameId);
    socket.emit('join-battle-game', { gameId });
  };

  const handleLeaveGame = (gameId) => {
    if (!socket?.connected) {
      alert('Нет соединения с сервером, попробуйте позже');
      return;
    }
    const game = games.find((g) => g.id === gameId);
    if (game && game.state === 'countdown') {
      alert('Нельзя покинуть игру во время отсчета!');
      return;
    }
    socket.emit('leave-battle-game', { gameId });
    setJoinedGameId(null);
    setCountdown(null);
  };

  return (
    <div className="BattleMenuModal__container">
      <div className="BattleMenuModal__logo">
        <h1>Battles</h1>
        <div className="BattleMenuModal__close">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
      <div className="BattleMenuModal__content">
        <div className="BattleMenuModal__current-games__container">
          <h4>
            Текущие игры <p>{games.length} из 5 доступно</p>
          </h4>
          <div className="BattleMenuModal__current-games">
            {games
              .sort((a, b) => a.id.localeCompare(b.id))
              .map((game, index) => (
                <div key={game.id} className="BattleMenuModal__game">
                  <p>
                    Игра {index + 1} - Статус: {game.state}
                  </p>
                  <GamePhoto players={game.players || []} />
                  {joinedGameId === game.id ? (
                    <>
                      <p>
                        {game.state === 'countdown'
                          ? `Игра начнётся через ${countdown} секунд`
                          : game.state === 'drawing'
                          ? 'Игра в процессе'
                          : game.state === 'evaluation'
                          ? 'Оценка рисунков'
                          : game.state === 'finished'
                          ? 'Игра завершена'
                          : 'Ожидание игроков...'}
                      </p>
                      <button onClick={() => handleLeaveGame(game.id)}>
                        Отключиться
                      </button>
                    </>
                  ) : game.state === 'waiting' ? (
                    <button
                      onClick={() => handleJoinGame(game.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Подключаемся...' : 'Подключиться'}
                    </button>
                  ) : (
                    <p>Игра уже началась</p>
                  )}
                </div>
              ))}
          </div>
        </div>
        <div className="BattleMenuModal__random-game__container">
          <h4>Случайная игра</h4>
          <button onClick={() => handleJoinGame('random')} disabled={isLoading}>
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

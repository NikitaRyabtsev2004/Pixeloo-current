import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

const BattleGameModal = ({ 
  gameId, 
  isOpen, 
  onClose, 
  socket, 
  gameState, 
  word, 
  drawingTime, 
  countdown, 
  isEvaluating, 
  currentEvaluation, 
  gameResults 
}) => {
  const navigate = useNavigate();
  const [localDrawingTime, setLocalDrawingTime] = useState(drawingTime);
  const [localCountdown, setLocalCountdown] = useState(countdown);
  const [localEvaluationTime, setLocalEvaluationTime] = useState(null);

  // ИСПРАВЛЕНО: синхронизация времени с сервером и локальный таймер
  useEffect(() => {
    setLocalDrawingTime(drawingTime);
    setLocalCountdown(countdown);

    // ИСПРАВЛЕНО: локальный countdown таймер для плавного отображения
    let countdownInterval;
    if (gameState === 'countdown' && countdown !== null && countdown > 0) {
      setLocalCountdown(countdown);
      countdownInterval = setInterval(() => {
        setLocalCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [countdown, gameState, drawingTime]);

  useEffect(() => {
    const handleDrawingTimeUpdate = ({ timeLeft }) => {
      setLocalDrawingTime(timeLeft);
    };

    const handleEvaluationTimeUpdate = ({ timeLeft }) => {
      setLocalEvaluationTime(timeLeft);
    };

    const handleGameState = (data) => {
      setLocalCountdown(data.countdown);
      
      // ИСПРАВЛЕНО: автоматическое перенаправление при начале игры
      if (data.status === 'drawing' && data.gameId && window.location.pathname !== `/battle/${data.gameId}`) {
        console.log('Game state changed to drawing, redirecting...');
        navigate(`/battle/${data.gameId}`);
      }
    };

    const handleStartDrawing = (data) => {
      console.log('Start drawing received in modal:', data);
      if (data.gameId && window.location.pathname !== `/battle/${data.gameId}`) {
        navigate(`/battle/${data.gameId}`);
      }
    };

    const handleError = (data) => {
      alert(data.message);
    };

    socket.on('drawing-time-update', handleDrawingTimeUpdate);
    socket.on('evaluation-time-update', handleEvaluationTimeUpdate);
    socket.on('game-state', handleGameState);
    socket.on('startDrawing', handleStartDrawing);
    socket.on('error', handleError);

    return () => {
      socket.off('drawing-time-update', handleDrawingTimeUpdate);
      socket.off('evaluation-time-update', handleEvaluationTimeUpdate);
      socket.off('game-state', handleGameState);
      socket.off('startDrawing', handleStartDrawing);
      socket.off('error', handleError);
    };
  }, [socket, navigate]);

  const handleSubmitEvaluation = (score) => {
    if (score >= 0 && score <= 9) {
      socket.emit('submit-evaluation', { gameId, score });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="battle-game-modal"
      style={{
        position: 'absolute',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'white',
        background: 'rgba(0,1,0,0.9)',
        padding: '15px',
        borderRadius: '10px',
        zIndex: '9999',
        minWidth: '300px',
        textAlign: 'center',
      }}
    >
      {gameState === 'waiting' && <p>Ожидание игроков...</p>}
      
      {gameState === 'countdown' && localCountdown !== null && (
        <div>
          <p><strong>Игра начнётся через {localCountdown} секунд</strong></p>
          <p>Приготовьтесь рисовать!</p>
        </div>
      )}
      
      {gameState === 'drawing' && (
        <div>
          <p>Тема: <strong>{word}</strong></p>
          <p>Осталось времени: {localDrawingTime} секунд</p>
          <p>Рисуйте на холсте!</p>
        </div>
      )}
      
      {gameState === 'evaluation' && isEvaluating && currentEvaluation && (
        <div>
          <p>Оцените рисунок игрока {currentEvaluation.playerId}</p>
          {localEvaluationTime !== null && (
            <p>Осталось времени: {localEvaluationTime} секунд</p>
          )}
          <div style={{ marginTop: '10px' }}>
            {[...Array(10)].map((_, i) => (
              <button
                key={i}
                onClick={() => handleSubmitEvaluation(i)}
                style={{ 
                  margin: '2px', 
                  padding: '5px 10px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {gameState === 'finished' && gameResults && (
        <div>
          <h3>Результаты голосования</h3>
          <div style={{ textAlign: 'left', margin: '10px 0' }}>
            {Object.entries(gameResults.scores).map(([playerId, score]) => (
              <p key={playerId} style={{ margin: '5px 0' }}>
                Игрок {playerId}: {score.toFixed(2)}
              </p>
            ))}
          </div>
          <p style={{ fontWeight: 'bold', color: '#FFD700' }}>
            🏆 Победитель: Игрок {gameResults.winner.playerId} со счётом {gameResults.winner.score.toFixed(2)}
          </p>
        </div>
      )}
      
      <button 
        onClick={onClose} 
        style={{ 
          marginTop: '10px',
          padding: '8px 16px',
          backgroundColor: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Закрыть
      </button>
    </div>
  );
};

BattleGameModal.propTypes = {
  gameId: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  socket: PropTypes.object.isRequired,
  gameState: PropTypes.string,
  word: PropTypes.string,
  drawingTime: PropTypes.number,
  countdown: PropTypes.number,
  isEvaluating: PropTypes.bool,
  currentEvaluation: PropTypes.object,
  gameResults: PropTypes.object,
};

export default BattleGameModal;

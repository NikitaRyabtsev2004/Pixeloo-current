import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import PropTypes from 'prop-types';
import config from '../../utils/config/config';
import { useNavigate } from 'react-router-dom';

const BattleGameModal = ({ gameId, isOpen, onClose, socket}) => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState('waiting');
  const [word, setWord] = useState(null);
  const [drawingTime, setDrawingTime] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState(null);
  const [gameResults, setGameResults] = useState(null);
  const [winnerCanvas, setWinnerCanvas] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    // Информируем сервер о текущем маршруте
    socket.emit('route', `/battle/${gameId}`);

    socket.on('game-state', (data) => {
      setGameState(data.status);
      if (data.status === 'countdown') {
        setCountdown(data.countdown);
      }
    });

    socket.on('startDrawing', (data) => {
      setGameState('drawing');
      setWord(data.word);
      setDrawingTime(data.timeLeft);
    });

    socket.on('startEvaluation', () => {
      setGameState('evaluation');
      setIsEvaluating(true);
    });

    socket.on('evaluateCanvas', (data) => {
      setCurrentEvaluation({
        playerId: data.playerId,
        canvasData: data.canvasData,
      });
    });

    socket.on('votingResults', (data) => {
      setGameResults({ scores: data.scores, winner: data.winner });
    });

    socket.on('showWinnerCanvas', (data) => {
      setWinnerCanvas(data.canvasData);
    });

    socket.on('gameFinished', (data) => {
      alert(data.message);
    });

    socket.on('redirectToMainCanvas', () => {
      navigate('/canvas-1');
    });

    return () => {
      socket.off('game-state');
      socket.off('startDrawing');
      socket.off('startEvaluation');
      socket.off('evaluateCanvas');
      socket.off('votingResults');
      socket.off('showWinnerCanvas');
      socket.off('gameFinished');
      socket.off('redirectToMainCanvas');
      socket.disconnect();
    };
  }, [gameId, isOpen, navigate]);

  useEffect(() => {
    let timer;
    if (drawingTime > 0) {
      timer = setInterval(() => setDrawingTime((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [drawingTime]);

  const handleSubmitEvaluation = (score) => {
    socket.emit('submit-evaluation', { gameId, score });
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
        background: 'rgba(0,0,0,0.8)',
        padding: '15px',
        borderRadius: '10px',
        zIndex: '9999',
        minWidth: '300px',
        textAlign: 'center',
      }}
    >
      {gameState === 'waiting' && <p>Ожидание игроков...</p>}
      {gameState === 'countdown' && countdown !== null && (
        <p>Игра начнётся через {countdown} секунд</p>
      )}
      {gameState === 'drawing' && (
        <>
          <p>Слово: <strong>{word}</strong></p>
          <p>Осталось времени: {drawingTime} секунд</p>
        </>
      )}
      {gameState === 'evaluation' && isEvaluating && currentEvaluation && (
        <div>
          <p>Оцените рисунок игрока {currentEvaluation.playerId}</p>
          {[...Array(10)].map((_, i) => (
            <button
              key={i}
              onClick={() => handleSubmitEvaluation(i + 1)}
              style={{ margin: '2px' }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
      {gameResults && (
        <div>
          <h3>Результаты голосования</h3>
          <ul>
            {Object.entries(gameResults.scores).map(([playerId, score]) => (
              <li key={playerId}>
                Игрок {playerId}: {score.toFixed(2)}
              </li>
            ))}
          </ul>
          <p>
            Победитель: Игрок {gameResults.winner.playerId} со счётом{' '}
            {gameResults.winner.score.toFixed(2)}
          </p>
          {winnerCanvas && (
            <div>
              <h4>Холст победителя</h4>
              {/* Тебе здесь нужно отрисовать Canvas из winnerCanvas.canvasData */}
            </div>
          )}
        </div>
      )}
      <button onClick={onClose} style={{ marginTop: '10px' }}>
        Закрыть
      </button>
    </div>
  );
};

BattleGameModal.propTypes = {
  gameId: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default BattleGameModal;

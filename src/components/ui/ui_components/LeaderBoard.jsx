import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { playSound } from '../../../utils/functions/sounds/sounds';
import { useSettings } from '../../../hooks/useSettings';

const LeaderBoard = ({ socket }) => {
  const [leaders, setLeaders] = useState([]);
  const [leadersCanvas1, setLeadersCanvas1] = useState([]);
  const [leadersCanvas2, setLeadersCanvas2] = useState([]);
  const [leadersCanvas3, setLeadersCanvas3] = useState([]);
  const [isState, setState] = useState(1);
  const [username, setUsername] = useState('');
  const { isSoundsOn } = useSettings();

  useEffect(() => {
    if (!socket) return;

    const fetchLeaderboardAll = () => {
      socket.emit('get-leaderboard');
    };

    fetchLeaderboardAll();
    const intervalAll = setInterval(fetchLeaderboardAll, 500);

    socket.on('updateLeaderboardAll', (data) => setLeaders(data));
    socket.on('updateLeaderboardCanvas1', (data) => setLeadersCanvas1(data));
    socket.on('updateLeaderboardCanvas2', (data) => setLeadersCanvas2(data));
    socket.on('updateLeaderboardCanvas3', (data) => setLeadersCanvas3(data));

    return () => {
      clearInterval(intervalAll);
      socket.off('updateLeaderboardAll');
      socket.off('updateLeaderboardCanvas1');
      socket.off('updateLeaderboardCanvas2');
      socket.off('updateLeaderboardCanvas3');
    };
  }, [socket]);

  const getLeaderboardData = () => {
    switch (isState) {
      case 1:
        return leaders;
      case 2:
        return leadersCanvas1;
      case 3:
        return leadersCanvas2;
      case 4:
        return leadersCanvas3;
      default:
        return [];
    }
  };

  useEffect(() => {
    if (!socket) return;

    socket.emit('get-username-data');

    const handleUsernameData = (data) => {
      if (data.success) {
        setUsername(data.username);
      } else {
        console.error('Ошибка получения данных:', data.error);
      }
    };

    socket.on('username-data', handleUsernameData);

    return () => {
      socket.off('username-data', handleUsernameData);
    };
  }, [socket]);

  const renderLeaderboard = (data) => (
    <ul className="LeaderBoard__list">
      {Array.isArray(data) &&
        data.map((leader, index) => (
          <li className="LeaderBoard__user" key={`${leader.username}-${index}`}>
            <div className="LeaderBoard__user__index">№{index + 1}.</div>
            <div className="LeaderBoard__user__data">
              <div className={leader.username === username ? 'LeaderBoard__user__username green' : 'LeaderBoard__user__username'}>
                {leader.username}
              </div>
              <div className="LeaderBoard__user__count">
                {leader.placedPixels}
              </div>
            </div>
          </li>
        ))}
    </ul>
  );

  const handleLeaderBoardClick = (e) => {
    setState(e);
    playSound(0.5, 'note-3.mp3', isSoundsOn);
  };

  return (
    <div className="LeaderBoard__container">
      <h2 className="LeaderBoard__logo">Leaders</h2>
      <div className="LeaderBoard__buttons">
        <button onClick={() => handleLeaderBoardClick(1)}>All</button>
        <button onClick={() => handleLeaderBoardClick(2)}>Canvas-1</button>
        <button onClick={() => handleLeaderBoardClick(3)}>Canvas-2</button>
        <button onClick={() => handleLeaderBoardClick(4)}>Canvas-3</button>
      </div>
      <div className="LeaderBoard__title">
        <div>Place</div>
        <div className="LeaderBoard__title__data">
          <div>Username</div>
          <div>Pixel count</div>
        </div>
      </div>
      {renderLeaderboard(getLeaderboardData())}
    </div>
  );
};

LeaderBoard.propTypes = {
  socket: PropTypes.object.isRequired,
};

export default LeaderBoard;

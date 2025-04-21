import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setAchievements } from '../redux/slices/achievementsSlice';

export const useAchievements = ({ socket }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!socket) return;
    const fetchAchievements = () => {
      socket.emit('get-achievements-user-data');
    };

    fetchAchievements();

    const interval = setInterval(fetchAchievements, 500);
    const handler = (data) => {
      // console.log("🟢 данные достижений:", data);
      dispatch(setAchievements(data));
    };
    socket.on('achievements-user-data', handler);

    return () => {
      clearInterval(interval);
      socket.off('achievements-user-data', handler);
    };
  }, [socket, dispatch]);
};

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setColorSubscription } from '../redux/slices/subscriptionSlice';

export const useSubscriptions = ({ socket, uniqueIdentifier }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!socket || !uniqueIdentifier) return;

    const fetchSubscriptions = () => {
      socket.emit('get-subscription-data', { uniqueIdentifier });
    };

    fetchSubscriptions();

    const interval = setInterval(fetchSubscriptions, 5000);
    const handler = (data) => {
      dispatch(
        setColorSubscription({
          isColorSubscription: data.isColorSubscription,
          isColorSubscriptionTime: data.isColorSubscriptionTime,
        })
      );
    };
    socket.on('subscription-data', handler);

    return () => {
      clearInterval(interval);
      socket.off('subscription-data', handler);
    };
  }, [socket, uniqueIdentifier, dispatch]);
};

import { useEffect, useState } from 'react';

export const useSettings = () => {
  const [isHudOpen, setIsHudOpen] = useState(
    () => localStorage.getItem('HUD') === 'true'
  );
  const [isSoundsOn, setIsSoundsOn] = useState(
    () => localStorage.getItem('sounds') === 'true'
  );

  useEffect(() => {
    const handleStorageChange = () => {
      setIsHudOpen(localStorage.getItem('HUD') === 'true');
      setIsSoundsOn(localStorage.getItem('sounds') === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { isHudOpen, isSoundsOn };
};

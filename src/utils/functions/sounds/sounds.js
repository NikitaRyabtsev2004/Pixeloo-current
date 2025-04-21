const getVolumeFromLocalStorage = () => {
  const savedVolume = localStorage.getItem('volume');
  return savedVolume !== null ? parseFloat(savedVolume) / 100 : 0.5; // Значение по умолчанию 0.5 (50%)
};

export const playSound = (volume, soundName, isChecked) => {
  if (!isChecked) return;

  try {
    const audio = new Audio(`${process.env.PUBLIC_URL}/sounds/${soundName}`);
    const localVolume = getVolumeFromLocalStorage();
    audio.volume = volume * localVolume;
    audio.play().catch((error) => console.error('Error playing sound:', error));
  } catch (error) {
    console.error('Error loading sound:', error);
  }
};

const sounds = ['note-1.mp3', 'note-2.mp3', 'note-3.mp3', 'note-4.mp3'];

export const playSoundCanvas = (volume, isChecked) => {
  if (!isChecked) return;

  try {
    const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
    const audio = new Audio(`${process.env.PUBLIC_URL}/sounds/${randomSound}`);
    const localVolume = getVolumeFromLocalStorage();
    audio.volume = volume * localVolume;
    audio.play().catch((error) => console.error('Error playing sound:', error));
  } catch (error) {
    console.error('Error loading sound:', error);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'volume') {
      console.log('Volume updated in real time:', getVolumeFromLocalStorage());
    }
  });
}

import { playSound } from '../../../../utils/functions/sounds/sounds';

export const to = (setState, state, isSoundsOn) => {
  setState(state);
  playSound(0.5, 'to.mp3', isSoundsOn);
};

export const back = (setState, isSoundsOn) => {
  setState(0);
  playSound(0.5, 'out.mp3', isSoundsOn);
};

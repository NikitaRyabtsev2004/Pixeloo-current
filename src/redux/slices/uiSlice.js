import { createSlice } from '@reduxjs/toolkit';
import { playSound } from '../../utils/functions/sounds/sounds';

const initialState = {
  showAuthModal: true,
  showRulesModal: true,
  showControlPanel:
    JSON.parse(localStorage.getItem('showControlPanel')) ?? true,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleAuthModal(state) {
      state.showAuthModal = !state.showAuthModal;
    },
    toggleRulesModal(state) {
      state.showRulesModal = !state.showRulesModal;
    },
    toggleControlPanel(state, action) {
      const isSoundsOn = action.payload.isSoundsOn;
      if (state.showControlPanel) {
        playSound(0.5, 'out.mp3', isSoundsOn);
      } else {
        playSound(0.5, 'to.mp3', isSoundsOn);
      }
      state.showControlPanel = !state.showControlPanel;
      localStorage.setItem(
        'showControlPanel',
        JSON.stringify(state.showControlPanel)
      );
    },
  },
});

export const { toggleAuthModal, toggleRulesModal, toggleControlPanel } =
  uiSlice.actions;
export default uiSlice.reducer;

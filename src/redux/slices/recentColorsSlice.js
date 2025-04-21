import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  recentColors: JSON.parse(localStorage.getItem('recentColors')) || [],
};

const recentColorsSlice = createSlice({
  name: 'recentColors',
  initialState,
  reducers: {
    addRecentColor: (state, action) => {
      const newColor = action.payload;
      // цвета с ограничением в 10
      const updatedColors = [newColor, ...state.recentColors.filter((color) => color !== newColor)].slice(0, 10);
      state.recentColors = updatedColors;
      localStorage.setItem('recentColors', JSON.stringify(updatedColors));
    },
    setRecentColors: (state, action) => {
      const colors = action.payload;
      state.recentColors = colors;
      localStorage.setItem('recentColors', JSON.stringify(colors));
    },
  },
});

export const { addRecentColor, setRecentColors } = recentColorsSlice.actions;
export default recentColorsSlice.reducer;

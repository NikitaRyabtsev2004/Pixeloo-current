import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  currentColors: {
    P: "#24ffff",
    i: "#00FF00",
    x: "#FFFF00",
    e: "#FF0000",
    l: "#0000FF",
    o: "#FF00FF",
  },
};

const colorsSlice = createSlice({
  name: "colors",
  initialState,
  reducers: {
    updateColors(state) {
      state.currentColors = Object.keys(state.currentColors).reduce((acc, key) => {
        acc[key] = getRandomColor();
        return acc;
      }, {});
    },
  },
});

const getRandomColor = () => {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return `rgb(${r}, ${g}, ${b})`;
};

export const { updateColors } = colorsSlice.actions;
export default colorsSlice.reducer;

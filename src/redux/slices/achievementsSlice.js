import { createSlice } from '@reduxjs/toolkit';
import { achievementFields } from '../../utils/helpers/constants';

const initialState = {
  data: {
    firstAchive: 0,
    secondAchive: 0,
    thirdAchive: 0,
    fourthAchive: 0,
    fifthAchive: 0,
  },
  lastAchieved: null,
};

export const achievementsSlice = createSlice({
  name: 'achievements',
  initialState,
  reducers: {
    setAchievements: (state, action) => {
      const newAchievements = action.payload;
      let lastAchieved = null;

      if (state.data) {
        for (const field of achievementFields) {
          if (state.data[field] === 0 && newAchievements[field] === 1) {
            lastAchieved = {
              id: achievementFields.indexOf(field) + 1,
              field: field,
            };
            break;
          }
        }
      }

      state.data = newAchievements;
      if (lastAchieved) {
        state.lastAchieved = lastAchieved;
      }
    },
  },
});

export const { setAchievements } = achievementsSlice.actions;
export default achievementsSlice.reducer;

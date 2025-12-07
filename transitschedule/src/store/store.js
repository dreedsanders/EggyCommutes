import { configureStore } from '@reduxjs/toolkit';
import stopsReducer from './slices/stopsSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    stops: stopsReducer,
    auth: authReducer,
  },
});


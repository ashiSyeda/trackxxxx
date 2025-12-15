import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import usersReducer from './slices/usersSlice';
import routesReducer from './slices/routesSlice';
import vehiclesReducer from './slices/vehiclesSlice';
import cardsReducer from './slices/cardsSlice';
import gpsReducer from './slices/gpsSlice';
import accessLogsReducer from './slices/accessLogsSlice';
import permissionsReducer from './slices/permissionsSlice';
import categoriesReducer from './slices/categoriesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    routes: routesReducer,
    vehicles: vehiclesReducer,
    cards: cardsReducer,
    gps: gpsReducer,
    accessLogs: accessLogsReducer,
    permissions: permissionsReducer,
    categories: categoriesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

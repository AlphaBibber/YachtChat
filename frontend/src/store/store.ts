import {Action, configureStore, ThunkAction} from '@reduxjs/toolkit';
import userReducer from './userSlice';
import webSocketSlice from "./connectionSlice";
import rtcSlice from "./rtcSlice";

export const store = configureStore({
  reducer: {
    userState: userReducer,
    webSocket: webSocketSlice,
    rtc: rtcSlice
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

import { configureStore } from '@reduxjs/toolkit';
import auth from '../features/authSlice';
import books from '../features/booksSlice';
import notifications from '../features/notificationSlice';

export const store = configureStore({
  reducer: { auth, books, notifications },
});

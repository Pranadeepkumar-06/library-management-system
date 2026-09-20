import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchNotifications = createAsyncThunk('notifications/list', async (params = {}) => {
  const { data } = await api.get('/notifications', { params });
  return data;
});

export const fetchUnread = createAsyncThunk('notifications/unread', async () => {
  const { data } = await api.get('/notifications/unread-count');
  return data.data.unread;
});

const slice = createSlice({
  name: 'notifications',
  initialState: { items: [], meta: null, unread: 0 },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchNotifications.fulfilled, (s, a) => { s.items = a.payload.data; s.meta = a.payload.meta; });
    b.addCase(fetchUnread.fulfilled, (s, a) => { s.unread = a.payload; });
  },
});

export default slice.reducer;

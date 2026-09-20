import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchMe = createAsyncThunk('auth/me', async () => {
  const { data } = await api.get('/auth/me');
  return data.data.user;
});

export const login = createAsyncThunk('auth/login', async ({ identifier, password }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', { identifier, password });
    return data.data.user;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Login failed');
  }
});

export const registerUser = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', payload);
    return data.data.user;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Registration failed');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await api.post('/auth/logout');
  return null;
});

const slice = createSlice({
  name: 'auth',
  initialState: { user: null, status: 'idle', error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchMe.pending, (s) => { s.status = 'loading'; });
    b.addCase(fetchMe.fulfilled, (s, a) => { s.status = 'ready'; s.user = a.payload; });
    b.addCase(fetchMe.rejected, (s) => { s.status = 'ready'; s.user = null; });
    b.addCase(login.pending, (s) => { s.status = 'loading'; s.error = null; });
    b.addCase(login.fulfilled, (s, a) => { s.status = 'ready'; s.user = a.payload; });
    b.addCase(login.rejected, (s, a) => { s.status = 'ready'; s.error = a.payload; });
    b.addCase(registerUser.pending, (s) => { s.status = 'loading'; s.error = null; });
    b.addCase(registerUser.fulfilled, (s, a) => { s.status = 'ready'; s.user = a.payload; });
    b.addCase(registerUser.rejected, (s, a) => { s.status = 'ready'; s.error = a.payload; });
    b.addCase(logout.fulfilled, (s) => { s.user = null; s.status = 'ready'; });
  },
});

export default slice.reducer;

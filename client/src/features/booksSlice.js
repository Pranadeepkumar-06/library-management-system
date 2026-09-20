import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchBooks = createAsyncThunk('books/list', async (params = {}) => {
  const { data } = await api.get('/books', { params });
  return data;
});

export const fetchBook = createAsyncThunk('books/one', async (id) => {
  const { data } = await api.get(`/books/${id}`);
  return data.data.book;
});

const slice = createSlice({
  name: 'books',
  initialState: { items: [], meta: null, status: 'idle', detail: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchBooks.pending, (s) => { s.status = 'loading'; });
    b.addCase(fetchBooks.fulfilled, (s, a) => { s.status = 'ready'; s.items = a.payload.data; s.meta = a.payload.meta; });
    b.addCase(fetchBooks.rejected, (s) => { s.status = 'error'; });
    b.addCase(fetchBook.fulfilled, (s, a) => { s.detail = a.payload; });
  },
});

export default slice.reducer;

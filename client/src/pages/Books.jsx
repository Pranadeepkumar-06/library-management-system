import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBooks } from '../features/booksSlice';
import BookCard from '../components/BookCard';
import SearchBar, { Pagination } from '../components/SearchBar';
import { LoadingSpinner, EmptyState } from '../components/Feedback';
import api from '../services/api';

const Books = () => {
  const dispatch = useDispatch();
  const { items, meta, status } = useSelector((s) => s.books);
  const [params, setParams] = useState({ page: 1, limit: 12 });
  const [filters, setFilters] = useState({ language: '', available: false });
  const [cats, setCats] = useState([]);

  useEffect(() => { api.get('/categories', { params: { limit: 50 } }).then((r) => setCats(r.data.data)).catch(() => {}); }, []);
  useEffect(() => { dispatch(fetchBooks({ ...params, ...filters, available: filters.available ? 'true' : undefined })); }, [dispatch, params, filters]);

  return (
    <div>
      <div className="card bg-gradient-to-r from-indigo-700 to-indigo-500 text-white">
        <h1 className="text-2xl font-black">Find your next book</h1>
        <p className="text-sm text-indigo-100">Search by title, ISBN, or tag. Filter by language and availability.</p>
        <div className="mt-3 rounded-xl bg-white p-2"><SearchBar onSearch={(search) => setParams((p) => ({ ...p, page: 1, search }))} /></div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select className="input !w-auto" value={filters.language} onChange={(e) => setFilters((f) => ({ ...f, language: e.target.value }))}>
          <option value="">All languages</option><option>English</option><option>Spanish</option><option>French</option><option>German</option>
        </select>
        <select className="input !w-auto" onChange={(e) => setParams((p) => ({ ...p, page: 1, category: e.target.value || undefined }))} defaultValue="">
          <option value="">All categories</option>{cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.available} onChange={(e) => setFilters((f) => ({ ...f, available: e.target.checked }))} /> Available only</label>
      </div>
      {status === 'loading' ? <LoadingSpinner /> : items.length === 0 ? <div className="mt-4"><EmptyState title="No books found" hint="Try a different search." /></div> : (
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.map((b) => <BookCard key={b._id} book={b} />)}
        </div>
      )}
      <Pagination meta={meta} onPage={(page) => setParams((p) => ({ ...p, page }))} />
    </div>
  );
};

export default Books;

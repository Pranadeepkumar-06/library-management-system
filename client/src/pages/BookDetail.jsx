import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api, { coverUrl, errMsg } from '../services/api';
import { AvailabilityBadge } from '../components/BookCard';
import { LoadingSpinner, ErrorMessage } from '../components/Feedback';

const BookDetail = () => {
  const { id } = useParams();
  const { user } = useSelector((s) => s.auth);
  const [book, setBook] = useState(null);
  const [copies, setCopies] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      setError('');
      const { data } = await api.get(`/books/${id}`);
      setBook(data.data.book);
      const c = await api.get(`/books/${id}/copies`);
      setCopies(c.data.data.copies);
    } catch (e) { setError(errMsg(e)); }
  };
  useEffect(() => { load(); }, [id]);

  const reserve = async () => {
    try { setMsg(''); await api.post('/reservations', { bookId: id }); setMsg('Reserved! Check My Reservations.'); }
    catch (e) { setMsg(errMsg(e)); }
  };

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!book) return <LoadingSpinner />;
  const url = coverUrl(book.coverImage);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="card lg:col-span-2">
        <div className="flex flex-col gap-5 sm:flex-row">
          {url ? <img src={url} alt={book.title} className="h-64 w-44 rounded-xl object-cover" /> : (
            <div className="flex h-64 w-44 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-amber-400 text-6xl font-black text-white">{book.title.slice(0, 1)}</div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-black">{book.title}</h1>
            {book.subtitle && <p className="text-slate-500">{book.subtitle}</p>}
            <p className="mt-1 text-sm text-slate-600">{(book.authors || []).map((a) => a.fullName).join(', ')}</p>
            <div className="mt-2"><AvailabilityBadge book={book} /></div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <span><b>ISBN:</b> {book.isbn13 || book.isbn10 || '—'}</span>
              <span><b>Language:</b> {book.language}</span>
              <span><b>Publisher:</b> {book.publisher?.name || '—'}</span>
              <span><b>Format:</b> {book.bookFormat}</span>
              <span><b>Pages:</b> {book.pages || '—'}</span>
              <span><b>Location:</b> {book.shelfLocation || '—'} / {book.rackNumber || '—'}</span>
              <span><b>Total:</b> {book.totalCopies}</span>
              <span><b>Available:</b> {book.availableCopies}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">{(book.categories || []).map((c) => <span key={c._id} className="badge-blue">{c.name}</span>)}</div>
            {user?.role === 'MEMBER' && (
              <button className="btn-primary mt-4" onClick={reserve}>Reserve this book</button>
            )}
            {msg && <p className="mt-2 text-sm text-slate-600">{msg}</p>}
          </div>
        </div>
        {book.description && <p className="mt-5 text-sm leading-relaxed text-slate-600">{book.description}</p>}
      </div>
      <div className="card">
        <h2 className="font-bold">Copies ({copies.length})</h2>
        <div className="mt-2 max-h-96 space-y-2 overflow-auto">
          {copies.map((c) => (
            <div key={c._id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="font-mono">{c.accessionNumber}</span>
              <span className={c.status === 'AVAILABLE' ? 'badge-green' : c.status === 'BORROWED' ? 'badge-amber' : 'badge-slate'}>{c.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BookDetail;

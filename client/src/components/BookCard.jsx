import { Link } from 'react-router-dom';
import { coverUrl } from '../services/api';

export const AvailabilityBadge = ({ book }) => {
  if (book?.status === 'ARCHIVED') return <span className="badge-slate">Archived</span>;
  if ((book?.availableCopies || 0) > 0) return <span className="badge-green">{book.availableCopies} available</span>;
  return <span className="badge-red">Unavailable</span>;
};

const Cover = ({ book }) => {
  const url = coverUrl(book?.coverImage);
  if (url) return <img src={url} alt={book.title} className="h-44 w-full rounded-xl object-cover" loading="lazy" />;
  const initial = (book?.title || 'B').slice(0, 1).toUpperCase();
  return (
    <div className="flex h-44 w-full items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-amber-400 text-5xl font-black text-white">
      {initial}
    </div>
  );
};

const BookCard = ({ book }) => (
  <Link to={`/books/${book._id}`} className="card transition hover:-translate-y-1 hover:shadow-lg">
    <Cover book={book} />
    <h3 className="mt-3 line-clamp-2 font-bold leading-snug">{book.title}</h3>
    <p className="mt-1 truncate text-sm text-slate-500">
      {(book.authors || []).map((a) => a.fullName || `${a.firstName} ${a.lastName}`).join(', ') || 'Unknown author'}
    </p>
    <div className="mt-2 flex items-center justify-between">
      <AvailabilityBadge book={book} />
      <span className="text-xs text-slate-400">{book.language || ''}</span>
    </div>
  </Link>
);

export default BookCard;

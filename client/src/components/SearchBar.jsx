import { useState } from 'react';

const SearchBar = ({ onSearch, initial = '' }) => {
  const [v, setV] = useState(initial);
  return (
    <form
      className="flex w-full gap-2"
      onSubmit={(e) => { e.preventDefault(); onSearch(v.trim()); }}
    >
      <input className="input" placeholder="Search title, ISBN, tag..." value={v} onChange={(e) => setV(e.target.value)} />
      <button className="btn-primary shrink-0" type="submit">Search</button>
    </form>
  );
};

export const Pagination = ({ meta, onPage }) => {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages } = meta;
  const nums = Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7);
  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <button className="btn-secondary !px-3" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹</button>
      {nums.map((n) => (
        <button key={n} onClick={() => onPage(n)} className={n === page ? 'btn-primary !px-3' : 'btn-secondary !px-3'}>{n}</button>
      ))}
      <button className="btn-secondary !px-3" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>›</button>
    </div>
  );
};

export default SearchBar;

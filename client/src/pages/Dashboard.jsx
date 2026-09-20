import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../services/api';
import { LoadingSpinner, ErrorMessage } from '../components/Feedback';

const Card = ({ label, value, to }) => (
  <div className="card">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-3xl font-black">{value}</p>
    {to && <Link to={to} className="mt-2 inline-block text-sm text-indigo-600 hover:underline">View →</Link>}
  </div>
);

const Dashboard = ({ mode }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const endpoint = mode === 'admin' ? '/dashboard/admin' : mode === 'librarian' ? '/dashboard/librarian' : '/dashboard/member';

  useEffect(() => {
    api.get(endpoint).then((r) => setData(r.data.data)).catch((e) => setError(errMsg(e)));
  }, [endpoint]);

  if (error) return <ErrorMessage message={error} />;
  if (!data) return <LoadingSpinner />;

  if (mode === 'member' || data.borrowed) {
    return (
      <div>
        <h1 className="text-2xl font-black">My library</h1>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card label="Borrowed" value={data.borrowed?.length || 0} to="/my-books" />
          <Card label="Overdue" value={data.overdue?.length || 0} to="/my-books" />
          <Card label="Reservations" value={data.reservations?.length || 0} to="/my-reservations" />
          <Card label="Pending fines" value={`$${(data.fines?.total || 0).toFixed(2)}`} to="/my-fines" />
        </div>
        <div className="card mt-4">
          <h2 className="font-bold">Due soon</h2>
          {(data.borrowed || []).map((l) => (
            <div key={l._id} className="flex justify-between border-t border-slate-100 py-2 text-sm">
              <span>{l.book?.title}</span><span className="text-slate-500">due {new Date(l.dueDate).toLocaleDateString()}</span>
            </div>
          ))}
          {(data.borrowed || []).length === 0 && <p className="text-sm text-slate-500">Nothing borrowed.</p>}
        </div>
      </div>
    );
  }

  const isAdmin = mode === 'admin';
  return (
    <div>
      <h1 className="text-2xl font-black">{isAdmin ? 'Admin dashboard' : 'Librarian dashboard'}</h1>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isAdmin ? (
          <>
            <Card label="Members" value={data.users.members} to="/admin/members" />
            <Card label="Books" value={data.books.total} to="/admin/books" />
            <Card label="Copies available" value={data.books.available} to="/admin/book-copies" />
            <Card label="Overdue" value={data.loans.overdue} to="/librarian/loans?status=OVERDUE" />
            <Card label="Pending fines" value={`$${data.fines.pending.total.toFixed(2)}`} to="/librarian/fines" />
            <Card label="Collected" value={`$${data.fines.collected.total.toFixed(2)}`} to="/admin/reports" />
            <Card label="Reservations" value={data.reservations.active} to="/librarian/reservations" />
            <Card label="Borrowed copies" value={data.books.borrowed} to="/librarian/loans" />
          </>
        ) : (
          <>
            <Card label="Books" value={data.books.total} to="/librarian/books" />
            <Card label="Available" value={data.books.available} to="/librarian/book-copies" />
            <Card label="Active loans" value={data.loans.active} to="/librarian/loans" />
            <Card label="Overdue" value={data.loans.overdue} to="/librarian/loans" />
            <Card label="Reservations" value={data.reservations.active} to="/librarian/reservations" />
            <Card label="Members" value={data.members.total} to="/librarian/members" />
          </>
        )}
      </div>
      {data.loans?.dueSoon && (
        <div className="card mt-4">
          <h2 className="font-bold">Due within 3 days</h2>
          {data.loans.dueSoon.map((l) => (
            <div key={l._id} className="flex justify-between border-t border-slate-100 py-2 text-sm">
              <span>{l.book?.title} · {l.member?.email}</span><span>{new Date(l.dueDate).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
      {data.recent && (
        <div className="card mt-4">
          <h2 className="font-bold">Recently added</h2>
          {data.recent.books.map((b) => <p key={b._id} className="border-t border-slate-100 py-1 text-sm">{b.title}</p>)}
        </div>
      )}
    </div>
  );
};

export default Dashboard;

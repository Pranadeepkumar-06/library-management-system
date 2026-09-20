import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api, { errMsg } from '../services/api';
import { LoadingSpinner, EmptyState, ErrorMessage } from '../components/Feedback';

const statusColor = (s) => s === 'OVERDUE' ? 'badge-red' : s === 'BORROWED' ? 'badge-amber' : s === 'RETURNED' ? 'badge-green' : 'badge-slate';

const Loans = ({ mode }) => {
  const { user } = useSelector((s) => s.auth);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      setLoading(true); setError('');
      const url = mode === 'mine' ? `/loans/member/${user._id}` : '/loans';
      const { data } = await api.get(url, { params: { status: status || undefined, limit: 30 } });
      setItems(data.data);
    } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [status]);

  const renew = async (id) => {
    try { setMsg(''); await api.post(`/loans/${id}/renew`); setMsg('Renewed!'); load(); }
    catch (e) { setMsg(errMsg(e)); }
  };

  const [returnCond, setReturnCond] = useState('GOOD');
  const returnBook = async (id) => {
    try {
      setMsg('');
      const { data } = await api.post(`/loans/${id}/return`, { condition: returnCond });
      setMsg(`Returned!${data.data.fine ? ` Fine $${data.data.fine.amount.toFixed(2)}.` : ''}${data.data.heldForReservation ? ' Held for reservation queue.' : ''}`);
      load();
    } catch (e) { setMsg(errMsg(e)); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-black">{mode === 'mine' ? 'My books' : 'Loans'}</h1>
        <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option><option>BORROWED</option><option>OVERDUE</option><option>RETURNED</option><option>LOST</option>
        </select>
      </div>
      {msg && <p className="card mt-3 text-sm">{msg}</p>}
      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} onRetry={load} /> : items.length === 0 ? <div className="mt-4"><EmptyState title="No loans" /></div> : (
        <div className="card mt-4 overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Book</th><th>Copy</th>{mode !== 'mine' && <th>Member</th>}<th>Due</th><th>Status</th><th>Renew</th>{mode !== 'mine' && <th>Return</th>}</tr></thead>
            <tbody>
              {items.map((l) => (
                <tr key={l._id}>
                  <td className="font-semibold">{l.book?.title}<br /><span className="font-mono text-xs text-slate-400">{l._id}</span></td>
                  <td className="font-mono text-xs">{l.bookCopy?.accessionNumber}</td>
                  {mode !== 'mine' && <td className="text-xs">{l.member?.email}</td>}
                  <td className="text-xs">{new Date(l.dueDate).toLocaleDateString()}<br /><span className="text-slate-400">×{l.renewalCount}/{l.maxRenewals}</span></td>
                  <td><span className={statusColor(l.status)}>{l.status}</span></td>
                  <td>{l.status === 'BORROWED' && <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => renew(l._id)}>Renew</button>}</td>
                  {mode !== 'mine' && (
                    <td className="whitespace-nowrap">
                      {['BORROWED', 'OVERDUE'].includes(l.status) ? (
                        <>
                          <select className="input !w-auto !px-1 !py-1 text-xs" value={returnCond} onChange={(e) => setReturnCond(e.target.value)}>
                            <option>GOOD</option><option>DAMAGED</option><option>LOST</option>
                          </select>
                          <button className="btn-primary ml-1 !px-2 !py-1 text-xs" onClick={() => returnBook(l._id)}>Return</button>
                        </>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Loans;

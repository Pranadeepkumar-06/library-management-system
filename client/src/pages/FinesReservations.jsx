import { useEffect, useState } from 'react';
import api, { errMsg } from '../services/api';
import { LoadingSpinner, EmptyState } from '../components/Feedback';

const FinesReservations = ({ view = 'fines', scope = 'mine' }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');
  const isFines = view === 'fines';
  const endpoint = isFines ? '/fines' : '/reservations';

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(endpoint, { params: { limit: 30, status: filter || undefined } });
      setItems(data.data);
    } catch (e) { setItems([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [view, filter]);

  const act = async (fn) => {
    try { setMsg(''); await fn(); setMsg('Done!'); load(); } catch (e) { setMsg(errMsg(e)); }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">{isFines ? (scope === 'mine' ? 'My fines' : 'Fines') : (scope === 'mine' ? 'My reservations' : 'Reservations')}</h1>
        <select className="input !w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All</option>
          {isFines ? (<><option>PENDING</option><option>PAID</option><option>WAIVED</option></>) : (<><option>ACTIVE</option><option>FULFILLED</option><option>CANCELLED</option><option>EXPIRED</option></>)}
        </select>
      </div>
      {msg && <p className="card mt-3 text-sm">{msg}</p>}
      {loading ? <LoadingSpinner /> : items.length === 0 ? <div className="mt-4"><EmptyState title={isFines ? 'No fines' : 'No reservations'} hint={isFines ? 'Overdue returns create fines automatically.' : 'Reserve a book from its detail page.'} /></div> : (
        <div className="card mt-4 overflow-x-auto p-0">
          <table className="table">
            <thead><tr>{isFines ? (<><th>Amount</th><th>Reason</th><th>Status</th><th>Actions</th></>) : (<><th>Book</th><th>Queue #</th><th>Expires</th><th>Status</th><th>Actions</th></>)}</tr></thead>
            <tbody>
              {items.map((it) => (
                <tr key={it._id}>
                  {isFines ? (<>
                    <td className="font-bold">${it.amount.toFixed(2)}</td>
                    <td className="text-xs">{it.reason}</td>
                    <td><span className={it.status === 'PENDING' ? 'badge-red' : 'badge-green'}>{it.status}</span></td>
                    <td>
                      {scope !== 'mine' && it.status === 'PENDING' && (
                        <><button className="text-xs text-indigo-600 hover:underline" onClick={() => act(() => api.patch(`/fines/${it._id}/pay`, { paymentMethod: 'CASH' }))}>Pay</button>
                        <button className="ml-2 text-xs text-slate-500 hover:underline" onClick={() => act(() => api.patch(`/fines/${it._id}/waive`, {}))}>Waive (admin)</button></>
                      )}
                    </td>
                  </>) : (<>
                    <td className="font-semibold">{it.book?.title}
                      {it.bookCopy && <br />}
                      {it.bookCopy && <span className="badge-amber">held {it.bookCopy.accessionNumber}</span>}
                    </td>
                    <td>#{it.queuePosition}</td>
                    <td className="text-xs">{new Date(it.expiryDate).toLocaleDateString()}</td>
                    <td><span className={it.status === 'ACTIVE' ? 'badge-green' : 'badge-slate'}>{it.status}</span></td>
                    <td className="whitespace-nowrap">
                      {scope !== 'mine' && it.status === 'ACTIVE' && (
                        <button
                          className="btn-primary !px-2 !py-1 text-xs disabled:opacity-40"
                          disabled={!((it.bookCopy) || (it.book?.status === 'AVAILABLE' && (it.book?.availableCopies || 0) > 0))}
                          title={it.bookCopy ? `Issue held copy ${it.bookCopy.accessionNumber}` : 'Issue (needs an available copy)'}
                          onClick={() => act(() => api.post(`/reservations/${it._id}/issue`))}
                        >
                          Issue
                        </button>
                      )}
                      {it.status === 'ACTIVE' && <button className="ml-2 text-xs text-red-600 hover:underline" onClick={() => act(() => api.delete(`/reservations/${it._id}`))}>Cancel</button>}
                    </td>
                  </>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FinesReservations;

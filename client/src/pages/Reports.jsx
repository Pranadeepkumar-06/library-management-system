import { useEffect, useState } from 'react';
import api, { errMsg } from '../services/api';
import { LoadingSpinner } from '../components/Feedback';

const endpoints = [['most-borrowed', 'Most borrowed'], ['most-active-members', 'Active members'], ['fines', 'Fine collection'], ['by-category', 'By category'], ['by-language', 'By language'], ['monthly', 'Monthly'], ['lost-damaged', 'Lost/damaged']];

const Reports = ({ tab = 'reports' }) => {
  const [active, setActive] = useState(tab === 'audit' ? 'audit' : 'most-borrowed');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runMsg, setRunMsg] = useState('');

  const runOverdue = async () => {
    try {
      setRunMsg('Running...');
      const { data: r } = await api.post('/reports/run-overdue');
      const d = r.data;
      setRunMsg(`Done: ${d.marked} newly overdue, ${d.finesTouched} fine(s) created/updated, ${d.reservationsExpired} reservation(s) expired.`);
    } catch (e) { setRunMsg(errMsg(e)); }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const url = active === 'audit' ? '/audit-logs' : `/reports/${active}`;
        const { data: r } = await api.get(url, { params: { limit: 15 } });
        setData(r.data ?? r);
      } catch (e) { setData({ error: errMsg(e) }); } finally { setLoading(false); }
    };
    load();
  }, [active]);

  return (
    <div>
      <h1 className="text-2xl font-black">{active === 'audit' ? 'Audit logs' : 'Reports & statistics'}</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        {endpoints.map(([k, l]) => <button key={k} onClick={() => setActive(k)} className={active === k ? 'btn-primary !px-3 !py-1.5' : 'btn-secondary !px-3 !py-1.5'}>{l}</button>)}
        <button onClick={() => setActive('audit')} className={active === 'audit' ? 'btn-primary !px-3 !py-1.5' : 'btn-secondary !px-3 !py-1.5'}>Audit</button>
        <button onClick={runOverdue} className="btn-danger !px-3 !py-1.5">Run overdue check</button>
      </div>
      {runMsg && <p className="card mt-3 text-sm">{runMsg}</p>}
      <div className="card mt-4">
        {loading ? <LoadingSpinner /> : data?.error ? <p className="text-sm text-red-600">{data.error}</p> : (
          <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">Reports support ?from=&to=&limit=&year= query params (e.g. /reports/fines?from=2026-01-01).</p>
    </div>
  );
};

export default Reports;

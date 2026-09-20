import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api, { errMsg } from '../services/api';
import { LoadingSpinner, EmptyState, Modal, ConfirmDialog } from '../components/Feedback';
import SearchBar, { Pagination } from '../components/SearchBar';

const Users = ({ role }) => {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const { register, handleSubmit, reset } = useForm();

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/users', { params: { page, limit: 15, search: search || undefined, role: role || undefined } });
      setItems(data.data); setMeta(data.meta);
    } catch (e) { /* show empty */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, role]);

  const create = async (v) => {
    try { await api.post('/users', { ...v, role: role || v.role || 'MEMBER' }); setShowForm(false); reset(); load(); }
    catch (e) { alert(errMsg(e)); }
  };
  const setStatus = async (id, status) => {
    try { await api.patch(`/users/${id}/status`, { status }); load(); } catch (e) { alert(errMsg(e)); }
  };
  const remove = async () => {
    try { await api.delete(`/users/${confirm}`); setConfirm(null); load(); } catch (e) { alert(errMsg(e)); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-black">{role ? `${role}s` : 'Users'}</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ New {role === 'MEMBER' ? 'member' : 'user'}</button>
      </div>
      <div className="mt-3"><SearchBar onSearch={(v) => { setSearch(v); setPage(1); const t = setTimeout(load, 50); return () => clearTimeout(t); }} /></div>
      {loading ? <LoadingSpinner /> : items.length === 0 ? <div className="mt-4"><EmptyState title="No users" /></div> : (
        <div className="card mt-4 overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map((u) => (
                <tr key={u._id}>
                  <td className="font-semibold">{u.firstName} {u.lastName}<br /><span className="font-mono text-xs text-slate-400">{u.membershipId || u.username}</span></td>
                  <td className="text-xs">{u.email}</td>
                  <td><span className="badge-blue">{u.role}</span></td>
                  <td><span className={u.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}>{u.status}</span></td>
                  <td className="whitespace-nowrap">
                    <select className="input !w-auto !py-1 text-xs" value={u.status} onChange={(e) => setStatus(u._id, e.target.value)}>
                      <option>ACTIVE</option><option>INACTIVE</option><option>SUSPENDED</option>
                    </select>
                    <button className="ml-2 text-xs text-red-600 hover:underline" onClick={() => setConfirm(u._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination meta={meta} onPage={setPage} />
      <Modal open={showForm} title="New user" onClose={() => setShowForm(false)}>
        <form onSubmit={handleSubmit(create)} className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="First name" {...register('firstName', { required: true })} />
          <input className="input" placeholder="Last name" {...register('lastName', { required: true })} />
          <input className="input" placeholder="Username" {...register('username', { required: true })} />
          <input className="input" placeholder="Email" {...register('email', { required: true })} />
          <input className="input col-span-2" type="password" placeholder="Password (8+, upper/lower/number)" {...register('password', { required: true })} />
          {!role && <select className="input col-span-2" {...register('role')}><option>MEMBER</option><option>LIBRARIAN</option><option>ADMIN</option></select>}
          <button className="btn-primary col-span-2">Create</button>
        </form>
      </Modal>
      <ConfirmDialog open={!!confirm} title="Delete user?" message="Blocked if the user has loan history — deactivate instead." onCancel={() => setConfirm(null)} onConfirm={remove} />
    </div>
  );
};

export default Users;

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import api, { errMsg } from '../services/api';
import { fetchNotifications, fetchUnread } from '../features/notificationSlice';
import { LoadingSpinner } from '../components/Feedback';

const Profile = ({ tab = 'profile' }) => {
  const { user } = useSelector((s) => s.auth);
  const { items, unread } = useSelector((s) => s.notifications);
  const dispatch = useDispatch();
  const [active, setActive] = useState(tab);
  const [msg, setMsg] = useState('');
  const { register, handleSubmit } = useForm();

  useEffect(() => { setActive(tab); }, [tab]);
  useEffect(() => { dispatch(fetchNotifications({ limit: 20 })); dispatch(fetchUnread()); }, [dispatch]);

  const changePassword = async (v) => {
    try { setMsg(''); await api.post('/auth/change-password', { currentPassword: v.currentPassword, newPassword: v.newPassword }); setMsg('Password changed!'); }
    catch (e) { setMsg(errMsg(e)); }
  };
  const markAll = async () => { await api.patch('/notifications/read-all'); dispatch(fetchNotifications({ limit: 20 })); dispatch(fetchUnread()); };
  const clearNotes = async () => {
    if (!confirm(`Permanently delete all ${items.length} notifications?`)) return;
    await api.delete('/notifications');
    dispatch(fetchNotifications({ limit: 20 }));
    dispatch(fetchUnread());
  };

  if (!user) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-black">Account</h1>
      <div className="mt-3 flex gap-2">
        {['profile', 'password', 'notifications'].map((t) => (
          <button key={t} onClick={() => setActive(t)} className={active === t ? 'btn-primary !px-3 !py-1.5' : 'btn-secondary !px-3 !py-1.5'}>{t}</button>
        ))}
      </div>
      {active === 'profile' && (
        <div className="card mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {[['Name', `${user.firstName} ${user.lastName}`], ['Email', user.email], ['Username', user.username], ['Role', user.role], ['Status', user.status], ['Membership', user.membershipId || '—'], ['Verified', user.isEmailVerified ? 'Yes' : 'No'], ['Member until', user.membershipExpiryDate ? new Date(user.membershipExpiryDate).toLocaleDateString() : '—']].map(([k, v]) => (
            <p key={k}><span className="text-slate-500">{k}:</span> <b>{v}</b></p>
          ))}
        </div>
      )}
      {active === 'password' && (
        <form onSubmit={handleSubmit(changePassword)} className="card mt-4 max-w-md space-y-3">
          <input type="password" className="input" placeholder="Current password" {...register('currentPassword', { required: true })} />
          <input type="password" className="input" placeholder="New password (8+, upper/lower/number)" {...register('newPassword', { required: true, minLength: 8 })} />
          <button className="btn-primary w-full">Change password</button>
          {msg && <p className="text-sm">{msg}</p>}
        </form>
      )}
      {active === 'notifications' && (
        <div className="card mt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Notifications ({unread} unread)</h2>
            <div className="flex gap-2">
              <button className="btn-secondary !py-1 text-xs" onClick={markAll}>Mark all read</button>
              <button className="btn-danger !py-1 text-xs" onClick={clearNotes}>Clear all</button>
            </div>
          </div>
          <div className="mt-2 space-y-2">
            {items.map((n) => (
              <div key={n._id} className={`rounded-lg p-3 text-sm ${n.isRead ? 'bg-slate-50' : 'bg-indigo-50'}`}>
                <p className="font-bold">{n.title} <span className="badge-slate ml-1">{n.type}</span></p>
                <p className="text-slate-600">{n.message}</p>
                {!n.isRead && <button className="mt-1 text-xs text-indigo-600 hover:underline" onClick={async () => { await api.patch(`/notifications/${n._id}/read`); dispatch(fetchNotifications({ limit: 20 })); dispatch(fetchUnread()); }}>Mark read</button>}
              </div>
            ))}
            {items.length === 0 && <p className="text-sm text-slate-500">No notifications.</p>}
          </div>
        </div>
      )}
      {active === 'profile' && msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  );
};

export default Profile;

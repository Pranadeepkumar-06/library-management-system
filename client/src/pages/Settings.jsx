import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api, { errMsg } from '../services/api';
import { LoadingSpinner } from '../components/Feedback';

const fields = ['libraryName', 'libraryCode', 'address', 'phone', 'email', 'maxBooksPerMember', 'loanDurationDays', 'maximumRenewals', 'finePerDay', 'maximumFine', 'reservationDurationDays', 'membershipDurationDays'];

const Settings = () => {
  const { register, handleSubmit, reset } = useForm();
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings').then((r) => { reset(r.data.data.settings); setLoading(false); }).catch(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (v) => {
    try {
      const numbers = ['maxBooksPerMember', 'loanDurationDays', 'maximumRenewals', 'finePerDay', 'maximumFine', 'reservationDurationDays', 'membershipDurationDays'];
      numbers.forEach((k) => { if (v[k] !== '' && v[k] !== undefined) v[k] = Number(v[k]); });
      await api.put('/settings', v);
      setMsg('Saved!');
    } catch (e) { setMsg(errMsg(e)); }
  };

  if (loading) return <LoadingSpinner />;
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-black">Library settings</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="card mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f}><label className="label">{f}</label><input className="input" {...register(f)} /></div>
        ))}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('allowReservations')} /> Allow reservations</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('allowRenewals')} /> Allow renewals</label>
        <button className="btn-primary sm:col-span-2">Save settings</button>
        {msg && <p className="text-sm sm:col-span-2">{msg}</p>}
      </form>
    </div>
  );
};

export default Settings;

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../services/api';

export const ForgotPassword = () => {
  const { register, handleSubmit } = useForm();
  const [msg, setMsg] = useState('');
  const onSubmit = async (v) => {
    try { const { data } = await api.post('/auth/forgot-password', v); setMsg(data.message); }
    catch (e) { setMsg(errMsg(e)); }
  };
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <h1 className="text-xl font-black">Forgot password</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
        <input className="input" placeholder="Email" {...register('email', { required: true })} />
        <button className="btn-primary w-full">Send reset link</button>
      </form>
      {msg && <p className="mt-3 text-sm text-slate-600">{msg} (dev: check server/logs/emails.log)</p>}
      <Link to="/login" className="mt-3 inline-block text-sm text-indigo-600">Back to login</Link>
    </div>
  );
};

export const ResetPassword = () => {
  const { register, handleSubmit } = useForm();
  const [msg, setMsg] = useState('');
  const params = new URLSearchParams(window.location.search);
  const onSubmit = async (v) => {
    try {
      const { data } = await api.post('/auth/reset-password', { token: params.get('token') || v.token, password: v.password });
      setMsg(data.message);
    } catch (e) { setMsg(errMsg(e)); }
  };
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <h1 className="text-xl font-black">Reset password</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
        {!params.get('token') && <input className="input" placeholder="Token from email" {...register('token', { required: true })} />}
        <input type="password" className="input" placeholder="New password" {...register('password', { required: true, minLength: 8 })} />
        <button className="btn-primary w-full">Reset</button>
      </form>
      {msg && <p className="mt-3 text-sm text-slate-600">{msg}</p>}
    </div>
  );
};

export const VerifyEmail = () => {
  const [msg, setMsg] = useState('');
  const params = new URLSearchParams(window.location.search);
  const verify = async () => {
    try {
      const { data } = await api.post('/auth/verify-email', { token: params.get('token'), email: params.get('email') });
      setMsg(data.message);
    } catch (e) { setMsg(errMsg(e)); }
  };
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
      <h1 className="text-xl font-black">Email verification</h1>
      <button className="btn-primary mt-4" onClick={verify}>Verify my email</button>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
      <Link to="/login" className="mt-3 block text-sm text-indigo-600">Login</Link>
    </div>
  );
};

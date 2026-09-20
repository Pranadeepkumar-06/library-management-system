import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login } from '../features/authSlice';

const Login = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const { error } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/books';

  const onSubmit = async (v) => {
    const r = await dispatch(login({ identifier: v.identifier, password: v.password }));
    if (r.meta.requestStatus === 'fulfilled') navigate(from, { replace: true });
  };

  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <h1 className="text-2xl font-black">Welcome back</h1>
      <p className="mb-5 text-sm text-slate-500">Log in to your library account.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Email or username</label>
          <input className="input" {...register('identifier', { required: 'Required' })} />
          {errors.identifier && <p className="text-xs text-red-600">{errors.identifier.message}</p>}
        </div>
        <div>
          <label className="label">Password</label>
          <input type="password" className="input" {...register('password', { required: 'Required' })} />
          {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Logging in...' : 'Login'}</button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link to="/register" className="text-indigo-600 hover:underline">Create account</Link>
        <Link to="/forgot-password" className="text-indigo-600 hover:underline">Forgot password?</Link>
      </div>
      <p className="mt-4 rounded-lg bg-slate-100 p-2 text-xs text-slate-500">Seed logins: admin@library.local / Admin1234 · member1@library.local / Member1234</p>
    </div>
  );
};

export default Login;

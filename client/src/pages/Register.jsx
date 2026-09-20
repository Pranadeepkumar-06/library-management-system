import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../features/authSlice';

const Register = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const { error } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onSubmit = async (v) => {
    const r = await dispatch(registerUser(v));
    if (r.meta.requestStatus === 'fulfilled') navigate('/books');
  };

  return (
    <div className="mx-auto mt-10 max-w-lg rounded-2xl bg-white p-6 shadow-xl">
      <h1 className="text-2xl font-black">Join the library</h1>
      <p className="mb-5 text-sm text-slate-500">Members can search, borrow, and reserve books.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">First name</label>
          <input className="input" {...register('firstName', { required: 'Required' })} />
          {errors.firstName && <p className="text-xs text-red-600">Required</p>}
        </div>
        <div>
          <label className="label">Last name</label>
          <input className="input" {...register('lastName', { required: 'Required' })} />
          {errors.lastName && <p className="text-xs text-red-600">Required</p>}
        </div>
        <div>
          <label className="label">Username</label>
          <input className="input" {...register('username', { required: 'Required', minLength: { value: 3, message: 'Min 3 chars' }, pattern: { value: /^[a-z0-9_.]+$/i, message: 'Letters, numbers, . _ only' } })} />
          {errors.username && <p className="text-xs text-red-600">{errors.username.message}</p>}
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" {...register('email', { required: 'Required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })} />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="label">Password (8+, upper, lower, number)</label>
          <input type="password" className="input" {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' }, validate: (v) => (/[A-Z]/.test(v) && /[a-z]/.test(v) && /[0-9]/.test(v)) || 'Needs upper, lower, number' })} />
          {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="label">Phone (optional)</label>
          <input className="input" {...register('phone')} />
        </div>
        {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
        <button className="btn-primary sm:col-span-2" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create account'}</button>
      </form>
      <p className="mt-4 text-sm">Have an account? <Link to="/login" className="text-indigo-600 hover:underline">Login</Link></p>
    </div>
  );
};

export default Register;

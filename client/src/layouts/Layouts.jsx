import { Outlet, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar, { Footer } from '../components/Sidebar';

export const MainLayout = () => (
  <div className="min-h-screen bg-slate-100">
    <Navbar />
    <div className="mx-auto flex max-w-7xl gap-4 px-4 py-6">
      <Sidebar />
      <main className="min-w-0 flex-1"><Outlet /><Footer /></main>
    </div>
  </div>
);

export const PublicLayout = () => (
  <div className="min-h-screen bg-gradient-to-br from-library-900 via-indigo-800 to-indigo-500">
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link to="/books" className="text-xl font-black text-white">📚 Central Library</Link>
      <Outlet />
    </div>
  </div>
);

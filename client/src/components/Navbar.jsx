import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/authSlice';
import { useEffect } from 'react';
import { fetchUnread } from '../features/notificationSlice';

const Navbar = () => {
  const { user } = useSelector((s) => s.auth);
  const { unread } = useSelector((s) => s.notifications);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => { if (user) dispatch(fetchUnread()); }, [user, dispatch]);

  const home = user ? (user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'LIBRARIAN' ? '/librarian/dashboard' : '/home') : '/books';

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-library-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link to={home} className="flex items-center gap-2 text-lg font-black">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-xl text-library-900">📚</span>
          Central Library
        </Link>
        <nav className="hidden items-center gap-4 text-sm md:flex">
          <Link to="/books" className="hover:text-amber-300">Catalog</Link>
          {user?.role === 'MEMBER' && <Link to="/my-books" className="hover:text-amber-300">My Books</Link>}
          {(user?.role === 'ADMIN' || user?.role === 'LIBRARIAN') && <Link to="/librarian/loans" className="hover:text-amber-300">Loans</Link>}
          {user?.role === 'ADMIN' && <Link to="/admin/reports" className="hover:text-amber-300">Reports</Link>}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/notifications" className="relative rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20">
                🔔 {unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-xs">{unread}</span>}
              </Link>
              <Link to="/profile" className="hidden rounded-lg bg-white/10 px-3 py-2 text-sm sm:block hover:bg-white/20">
                {user.firstName} · {user.role}
              </Link>
              <button
                className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-library-900 hover:bg-amber-300"
                onClick={async () => { await dispatch(logout()); navigate('/login'); }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20">Login</Link>
              <Link to="/register" className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-library-900 hover:bg-amber-300">Join</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

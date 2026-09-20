import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';

const linksFor = (role) => {
  if (role === 'ADMIN') return [
    ['/admin/dashboard', '📊 Dashboard'], ['/admin/users', '👥 Users'], ['/admin/books', '📖 Books'],
    ['/admin/authors', '✍️ Catalog'], ['/librarian/loans', '🔄 Loans'], ['/librarian/reservations', '📌 Reservations'],
    ['/librarian/fines', '💰 Fines'], ['/admin/reports', '📈 Reports'], ['/admin/audit-logs', '🧾 Audit Logs'], ['/admin/settings', '⚙️ Settings'],
  ];
  if (role === 'LIBRARIAN') return [
    ['/librarian/dashboard', '📊 Dashboard'], ['/librarian/books', '📖 Books'], ['/librarian/book-copies', '📚 Copies'],
    ['/librarian/members', '👥 Members'],
    ['/librarian/loans', '🔄 Loans'], ['/librarian/reservations', '📌 Reservations'], ['/librarian/fines', '💰 Fines'],
  ];
  return [
    ['/home', '🏠 Home'], ['/books', '📖 Catalog'], ['/my-books', '📕 My Books'],
    ['/my-reservations', '📌 Reservations'], ['/my-fines', '💰 Fines'], ['/profile', '👤 Profile'],
  ];
};

const Sidebar = () => {
  const { user } = useSelector((s) => s.auth);
  if (!user) return null;
  return (
    <aside className="hidden w-60 shrink-0 rounded-2xl bg-library-900 p-3 text-white lg:block">
      {linksFor(user.role).map(([to, label]) => (
        <NavLink key={to} to={to} className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
          {label}
        </NavLink>
      ))}
    </aside>
  );
};

export const Footer = () => (
  <footer className="mt-10 border-t border-slate-200 py-6 text-center text-xs text-slate-500">
    Central Library Management System · MERN · {new Date().getFullYear()}
  </footer>
);

export default Sidebar;

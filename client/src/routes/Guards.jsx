import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { LoadingSpinner } from '../components/Feedback';

export const ProtectedRoute = ({ children }) => {
  const { user, status } = useSelector((s) => s.auth);
  const loc = useLocation();
  if (status === 'idle' || status === 'loading') return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return children;
};

export const RoleBasedRoute = ({ roles, children }) => {
  const { user, status } = useSelector((s) => s.auth);
  if (status !== 'ready') return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/books" replace />;
  return children;
};

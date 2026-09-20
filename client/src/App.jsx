import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout, PublicLayout } from './layouts/Layouts';
import { ProtectedRoute, RoleBasedRoute } from './routes/Guards';
import Login from './pages/Login';
import Register from './pages/Register';
import { ForgotPassword, ResetPassword, VerifyEmail } from './pages/AuthMisc';
import Books from './pages/Books';
import BookDetail from './pages/BookDetail';
import Dashboard from './pages/Dashboard';
import Loans from './pages/Loans';
import Users from './pages/Users';
import AdminCatalog from './pages/AdminCatalog';
import FinesReservations from './pages/FinesReservations';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

const staff = ['ADMIN', 'LIBRARIAN'];

const App = () => (
  <Routes>
    <Route element={<PublicLayout />}>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
    </Route>

    <Route element={<MainLayout />}>
      <Route path="/" element={<Navigate to="/books" replace />} />
      <Route path="/books" element={<Books />} />
      <Route path="/books/:id" element={<BookDetail />} />

      <Route path="/home" element={<ProtectedRoute><Dashboard mode="member" /></ProtectedRoute>} />
      <Route path="/my-books" element={<ProtectedRoute><Loans mode="mine" /></ProtectedRoute>} />
      <Route path="/my-reservations" element={<ProtectedRoute><FinesReservations view="reservations" scope="mine" /></ProtectedRoute>} />
      <Route path="/my-fines" element={<ProtectedRoute><FinesReservations view="fines" scope="mine" /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/change-password" element={<ProtectedRoute><Profile tab="password" /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Profile tab="notifications" /></ProtectedRoute>} />

      <Route path="/librarian/dashboard" element={<RoleBasedRoute roles={staff}><Dashboard mode="librarian" /></RoleBasedRoute>} />
      <Route path="/librarian/books" element={<RoleBasedRoute roles={staff}><AdminCatalog tab="books" /></RoleBasedRoute>} />
      <Route path="/librarian/books/add" element={<RoleBasedRoute roles={staff}><AdminCatalog tab="books" create /></RoleBasedRoute>} />
      <Route path="/librarian/books/:id/edit" element={<RoleBasedRoute roles={staff}><AdminCatalog tab="books" edit /></RoleBasedRoute>} />
      <Route path="/librarian/book-copies" element={<RoleBasedRoute roles={staff}><AdminCatalog tab="copies" /></RoleBasedRoute>} />
      <Route path="/librarian/members" element={<RoleBasedRoute roles={staff}><Users role="MEMBER" /></RoleBasedRoute>} />
      <Route path="/librarian/loans" element={<RoleBasedRoute roles={staff}><Loans mode="all" /></RoleBasedRoute>} />
      <Route path="/librarian/reservations" element={<RoleBasedRoute roles={staff}><FinesReservations view="reservations" scope="all" /></RoleBasedRoute>} />
      <Route path="/librarian/fines" element={<RoleBasedRoute roles={staff}><FinesReservations view="fines" scope="all" /></RoleBasedRoute>} />

      <Route path="/admin/dashboard" element={<RoleBasedRoute roles={['ADMIN']}><Dashboard mode="admin" /></RoleBasedRoute>} />
      <Route path="/admin/users" element={<RoleBasedRoute roles={['ADMIN']}><Users /></RoleBasedRoute>} />
      <Route path="/admin/librarians" element={<RoleBasedRoute roles={['ADMIN']}><Users role="LIBRARIAN" /></RoleBasedRoute>} />
      <Route path="/admin/members" element={<RoleBasedRoute roles={['ADMIN']}><Users role="MEMBER" /></RoleBasedRoute>} />
      <Route path="/admin/books" element={<RoleBasedRoute roles={['ADMIN']}><AdminCatalog tab="books" /></RoleBasedRoute>} />
      <Route path="/admin/authors" element={<RoleBasedRoute roles={['ADMIN']}><AdminCatalog tab="authors" /></RoleBasedRoute>} />
      <Route path="/admin/categories" element={<RoleBasedRoute roles={['ADMIN']}><AdminCatalog tab="categories" /></RoleBasedRoute>} />
      <Route path="/admin/publishers" element={<RoleBasedRoute roles={['ADMIN']}><AdminCatalog tab="publishers" /></RoleBasedRoute>} />
      <Route path="/admin/book-copies" element={<RoleBasedRoute roles={['ADMIN']}><AdminCatalog tab="copies" /></RoleBasedRoute>} />
      <Route path="/admin/loans" element={<RoleBasedRoute roles={['ADMIN']}><Loans mode="all" /></RoleBasedRoute>} />
      <Route path="/admin/reservations" element={<RoleBasedRoute roles={['ADMIN']}><FinesReservations view="reservations" scope="all" /></RoleBasedRoute>} />
      <Route path="/admin/fines" element={<RoleBasedRoute roles={['ADMIN']}><FinesReservations view="fines" scope="all" /></RoleBasedRoute>} />
      <Route path="/admin/reports" element={<RoleBasedRoute roles={['ADMIN']}><Reports /></RoleBasedRoute>} />
      <Route path="/admin/audit-logs" element={<RoleBasedRoute roles={['ADMIN']}><Reports tab="audit" /></RoleBasedRoute>} />
      <Route path="/admin/settings" element={<RoleBasedRoute roles={['ADMIN']}><Settings /></RoleBasedRoute>} />
    </Route>

    <Route path="*" element={<Navigate to="/books" replace />} />
  </Routes>
);

export default App;

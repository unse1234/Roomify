import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Gates routes behind an active session. Sits above nested routes
// via <Outlet />, so it's declared once per protected route group
// instead of wrapped around every individual page.
const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null; // or a spinner
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
};

export default ProtectedRoute;
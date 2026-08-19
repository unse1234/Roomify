import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const RoleRoute = ({ roles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="h-8 w-8 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const allowed = roles.some((role) => user.roles?.includes(role));
  if (!allowed) return <Navigate to="/" replace />;

  return <Outlet />;
};

export default RoleRoute;

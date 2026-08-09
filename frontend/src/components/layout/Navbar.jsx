import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import UserMenu from './UserMenu.jsx';

const Navbar = () => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold text-gray-900">
          <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Home className="w-4 h-4" />
          </span>
          Roomify
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link to="/host/new" className="hover:text-gray-900">Become a host</Link>
        </nav>

        {user ? (
          <UserMenu />
        ) : (
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link to="/login" className="text-gray-700 hover:text-gray-900">Log in</Link>
            <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
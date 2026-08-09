import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, User, LogOut, Calendar, MessageCircle, Home as HomeIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const UserMenu = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the dropdown when clicking anywhere outside it.
  useEffect(() => { 
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/');
  };

  const isHost = user?.roles?.includes('host');

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 border border-gray-200 rounded-full py-1.5 pl-3 pr-1.5 hover:shadow-sm transition-shadow"
      >
        <Menu className="w-4 h-4 text-gray-500" />
        <span className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
          {user?.name?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>

          <Link
            to="/bookings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Calendar className="w-4 h-4 text-gray-400" />
            My bookings
          </Link>

          <Link
            to="/chat"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <MessageCircle className="w-4 h-4 text-gray-400" />
            Messages
          </Link>

          {isHost && (
            <Link
              to="/host/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <HomeIcon className="w-4 h-4 text-gray-400" />
              Host dashboard
            </Link>
          )}

          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
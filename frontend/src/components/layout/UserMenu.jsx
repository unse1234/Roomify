import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, User, LogOut, Calendar, MessageCircle, Home as HomeIcon, Star, ClipboardList } from 'lucide-react';
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
        className="flex items-center gap-2 rounded-full border border-hairline py-1.5 pl-3 pr-1.5 transition-shadow hover:shadow-card"
        aria-expanded={isOpen}
        aria-label="Open user menu"
      >
        <Menu className="h-4 w-4 text-muted" />
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-strong text-xs font-semibold text-muted">
          {user?.name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-60 rounded-md border border-hairline bg-white py-2 shadow-card">
          <div className="border-b border-hairline-soft px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>

          <Link
            to="/bookings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface-soft"
          >
            <Calendar className="h-4 w-4 text-muted" />
            My bookings
          </Link>

          <Link
            to="/reviews"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface-soft"
          >
            <Star className="h-4 w-4 text-muted" />
            My reviews
          </Link>

          <Link
            to="/messages"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface-soft"
          >
            <MessageCircle className="h-4 w-4 text-muted" />
            Messages
          </Link>

          {isHost && (
            <Link
              to="/host/properties"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface-soft"
            >
              <HomeIcon className="h-4 w-4 text-muted" />
              Host properties
            </Link>
          )}

          {isHost && (
            <Link
              to="/host/bookings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface-soft"
            >
              <ClipboardList className="h-4 w-4 text-muted" />
              Host bookings
            </Link>
          )}

          <div className="mt-1 border-t border-hairline-soft pt-1">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-error hover:bg-[#fff4f1]"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;

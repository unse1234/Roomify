import { Link } from 'react-router-dom';
import { Globe2, Home, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import UserMenu from './UserMenu.jsx';

const Navbar = () => {
  const { user } = useAuth();
  const isHost = user?.roles?.includes('host');

  return (
    <header className="sticky top-0 z-40 border-b border-hairline-soft bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-[1128px] items-center justify-between px-5 md:px-8">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary" aria-label="Roomify home">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary text-primary">
            <Home className="h-5 w-5" />
          </span>
          Roomify
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-ink md:flex">
          {user && (
            <>
              <Link to="/bookings" className="hover:text-primary">Bookings</Link>
              <Link to="/messages" className="hover:text-primary">Messages</Link>
            </>
          )}
          <Link to={isHost ? '/host/properties' : '/register'} className="hover:text-primary">
            {isHost ? 'Host dashboard' : 'Become a host'}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <button type="button" className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-surface-soft md:flex" aria-label="Language and region">
            <Globe2 className="h-5 w-5" />
          </button>

          {user ? (
            <UserMenu />
          ) : (
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Link to="/login" className="hidden rounded-full px-4 py-2 text-ink hover:bg-surface-soft sm:inline-flex">Log in</Link>
              <Link to="/register" className="btn-primary rounded-full px-5">Sign up</Link>
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

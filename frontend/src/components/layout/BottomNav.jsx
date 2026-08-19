import { Calendar, Heart, Home, MessageCircle, User } from 'lucide-react';
import { createElement } from 'react';
import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'Explore', icon: Home },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/bookings', label: 'Bookings', icon: Calendar },
  { to: '/messages', label: 'Inbox', icon: MessageCircle },
  { to: '/reviews', label: 'Profile', icon: User },
];

const BottomNav = () => (
  <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-white/95 px-2 pb-safe shadow-[0_-6px_18px_rgba(0,0,0,0.06)] backdrop-blur md:hidden">
    <div className="grid grid-cols-5">
      {items.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
              isActive ? 'text-primary' : 'text-ink'
            }`
          }
        >
          {createElement(icon, { className: 'h-5 w-5' })}
          {label}
        </NavLink>
      ))}
    </div>
  </nav>
);

export default BottomNav;

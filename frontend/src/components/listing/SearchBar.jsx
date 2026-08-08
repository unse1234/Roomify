import { useState } from 'react';
import { Search, MapPin, Calendar, Users } from 'lucide-react';

const SearchBar = ({ onSearch }) => {
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.({ location, checkIn, checkOut, guests });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center bg-white border border-gray-200 rounded-full shadow-sm divide-x divide-gray-200 max-w-3xl mx-auto"
    >
      <div className="flex items-center gap-2 px-5 py-3 flex-1 min-w-0">
        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Where are you going?"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full text-sm outline-none placeholder:text-gray-400"
        />
      </div>

      <div className="hidden sm:flex items-center gap-2 px-5 py-3 flex-1 min-w-0">
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="w-full text-sm outline-none text-gray-600"
        />
      </div>

      <div className="hidden sm:flex items-center gap-2 px-5 py-3 flex-1 min-w-0">
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className="w-full text-sm outline-none text-gray-600"
        />
      </div>

      <div className="hidden md:flex items-center gap-2 px-5 py-3 flex-1 min-w-0">
        <Users className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="number"
          min="1"
          placeholder="Guests"
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          className="w-full text-sm outline-none placeholder:text-gray-400"
        />
      </div>

      <button
        type="submit"
        className="m-1.5 shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 transition-colors"
      >
        <Search className="w-4 h-4" />
      </button>
    </form>
  );
};

export default SearchBar;
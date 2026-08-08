import { useState, useEffect } from 'react';
import { getProperties } from '../services/property.service.js';
import Navbar from '../components/layout/Navbar.jsx';
import SearchBar from '../components/listing/SearchBar.jsx';
import ListingCard from '../components/listing/ListingCard.jsx';
import ListingCardSkeleton from '../components/listing/ListingCardSkeleton.jsx';

const Home = () => {
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProperties = async (filters = {}) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await getProperties(filters);
      setProperties(res.data || []);
    } catch (err) {
      setError('Failed to load listings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="border-b border-gray-100 py-6 px-6">
        <SearchBar onSearch={fetchProperties} />
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 mb-6">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
            {Array.from({ length: 10 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">No listings found. Try adjusting your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
            {properties.map((property) => (
              <ListingCard key={property._id} property={property} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
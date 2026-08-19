import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SlidersHorizontal, Search, MapPin, Home as HomeIcon, Building2, Warehouse, TentTree, TreePine, LocateFixed } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getProperties, getWishlist, toggleWishlist } from '../services/property.service.js';
import Navbar from '../components/layout/Navbar.jsx';
import ListingCard from '../components/listing/ListingCard.jsx';
import ListingCardSkeleton from '../components/listing/ListingCardSkeleton.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';
import { EmptyState, ErrorState, PageShell } from '../components/common/StateViews.jsx';
import { AMENITIES, PROPERTY_TYPES, SORT_OPTIONS, buildPropertyParams } from '../utils/propertyFilters.js';
import { getApiErrorMessage, getApiErrorRequestId } from '../utils/apiError.js';
import { useAuth } from '../context/AuthContext.jsx';

const typeIcons = {
  apartment: Building2,
  house: HomeIcon,
  villa: Warehouse,
  cabin: TentTree,
  cottage: TreePine,
  studio: Building2,
  farmhouse: TreePine,
};

const FilterPanel = ({ values, onChange, onClear, mobile = false }) => {
  const selectedAmenities = values.amenities ? values.amenities.split(',').filter(Boolean) : [];

  const updateAmenity = (amenity) => {
    const next = selectedAmenities.includes(amenity)
      ? selectedAmenities.filter((item) => item !== amenity)
      : [...selectedAmenities, amenity];
    onChange({ amenities: next.join(','), page: 1 });
  };

  return (
    <aside className={mobile ? '' : 'sticky top-28 hidden h-fit rounded-md border border-hairline bg-white p-6 shadow-card lg:block'}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Filter by</h2>
        <button type="button" onClick={onClear} className="text-sm font-semibold text-primary">Clear all</button>
      </div>

      <div className="mt-6 space-y-6">
        <div>
          <label className="text-sm font-semibold text-ink" htmlFor={mobile ? 'mobile-min-price' : 'min-price'}>Price per night</label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <input id={mobile ? 'mobile-min-price' : 'min-price'} className="field" type="number" min="0" placeholder="Min" value={values.minPrice || ''} onChange={(e) => onChange({ minPrice: e.target.value, page: 1 })} />
            <input className="field" type="number" min="0" placeholder="Max" value={values.maxPrice || ''} onChange={(e) => onChange({ maxPrice: e.target.value, page: 1 })} />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-ink" htmlFor={mobile ? 'mobile-guests' : 'guests'}>Guests</label>
          <input id={mobile ? 'mobile-guests' : 'guests'} className="field mt-3" type="number" min="1" placeholder="Guests" value={values.maxGuests || ''} onChange={(e) => onChange({ maxGuests: e.target.value, page: 1 })} />
        </div>

        <div>
          <p className="text-sm font-semibold text-ink">Property type</p>
          <div className="mt-3 space-y-2">
            {PROPERTY_TYPES.map((type) => (
              <label key={type.label} className="flex min-h-9 items-center gap-3 text-sm text-ink">
                <input
                  type="radio"
                  name={mobile ? 'mobile-type' : 'type'}
                  checked={(values.type || '') === type.value}
                  onChange={() => onChange({ type: type.value, page: 1 })}
                  className="h-4 w-4 accent-primary"
                />
                {type.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-ink">Amenities</p>
          <div className="mt-3 space-y-2">
            {AMENITIES.map((amenity) => (
              <label key={amenity.value} className="flex min-h-9 items-center gap-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={selectedAmenities.includes(amenity.value)}
                  onChange={() => updateAmenity(amenity.value)}
                  className="h-4 w-4 rounded accent-primary"
                />
                {amenity.label}
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [locationText, setLocationText] = useState('');
  const [locationGap, setLocationGap] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const params = useMemo(() => buildPropertyParams(searchParams), [searchParams]);
  const values = Object.fromEntries(searchParams.entries());

  const propertiesQuery = useQuery({
    queryKey: ['properties', params],
    queryFn: () => getProperties(params),
  });

  const wishlistQuery = useQuery({
    queryKey: ['wishlist'],
    queryFn: getWishlist,
    enabled: Boolean(user),
  });

  const wishlistMutation = useMutation({
    mutationFn: toggleWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) next.delete(key);
      else next.set(key, value);
    });
    setSearchParams(next);
  };

  const clearFilters = () => setSearchParams(new URLSearchParams());

  const useNearMe = () => {
    if (!navigator.geolocation) {
      setLocationGap('Your browser cannot share location.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateParams({
          lat: String(position.coords.latitude),
          lng: String(position.coords.longitude),
          radius: searchParams.get('radius') || '10000',
          page: 1,
        });
        setLocationGap('');
      },
      () => setLocationGap('Location permission is needed for nearby stays.')
    );
  };

  const handleSearch = (event) => {
    event.preventDefault();
    if (locationText.trim()) {
      updateParams({ q: locationText.trim(), page: 1 });
      setLocationGap('');
    } else {
      setLocationGap('');
      updateParams({ q: '', page: 1 });
    }
  };

  const properties = propertiesQuery.data?.data || [];
  const wishlistIds = new Set((wishlistQuery.data?.data || []).map((property) => property._id));
  const total = propertiesQuery.data?.total || 0;
  const totalPages = propertiesQuery.data?.totalPages || 1;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <PageShell className="max-w-[1240px] pt-5">
        <form onSubmit={handleSearch} className="mx-auto flex max-w-4xl items-center rounded-full border border-hairline bg-white p-2 shadow-card">
          <div className="flex min-w-0 flex-1 items-center gap-3 px-4">
            <MapPin className="h-5 w-5 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <label className="block text-xs font-semibold text-ink" htmlFor="location-search">Where</label>
              <input
                id="location-search"
                value={locationText}
                onChange={(event) => setLocationText(event.target.value)}
                placeholder="Rawalpindi, Pakistan"
                className="w-full bg-transparent text-sm text-muted outline-none"
              />
            </div>
          </div>
          <div className="hidden min-w-[150px] border-l border-hairline px-4 sm:block">
            <label className="block text-xs font-semibold text-ink" htmlFor="hero-guests">Guests</label>
            <input id="hero-guests" type="number" min="1" value={values.maxGuests || ''} onChange={(event) => updateParams({ maxGuests: event.target.value, page: 1 })} placeholder="Add guests" className="w-full bg-transparent text-sm text-muted outline-none" />
          </div>
          <button type="button" onClick={useNearMe} className="mr-2 hidden h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold text-ink hover:bg-surface-soft md:flex">
            <LocateFixed className="h-4 w-4" />
            Near me
          </button>
          <button type="submit" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-active" aria-label="Search stays">
            <Search className="h-5 w-5" />
          </button>
        </form>

        {locationGap && (
          <p className="mx-auto mt-3 max-w-4xl rounded-sm border border-hairline bg-surface-soft px-3 py-2 text-sm text-muted">
            {locationGap}
          </p>
        )}

        <div className="mt-8 flex gap-4 overflow-x-auto border-b border-hairline-soft pb-3">
          {PROPERTY_TYPES.map((type) => {
            const Icon = typeIcons[type.value] || HomeIcon;
            const active = (values.type || '') === type.value;
            return (
              <button
                type="button"
                key={type.label}
                onClick={() => updateParams({ type: type.value, page: 1 })}
                className={`flex min-w-fit flex-col items-center gap-2 px-3 pb-2 text-xs font-semibold ${active ? 'text-primary' : 'text-muted hover:text-ink'}`}
              >
                <Icon className="h-6 w-6" />
                <span>{type.label}</span>
                {active && <span className="h-0.5 w-full rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Stays in Roomify</h1>
            <p className="mt-1 text-sm text-muted">{propertiesQuery.isLoading ? 'Loading stays...' : `${total} stays available`}</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setShowMobileFilters(true)} className="btn-secondary lg:hidden">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
            <label className="flex items-center gap-2 text-sm text-ink">
              <span className="hidden sm:inline">Sort by</span>
              <select className="field min-w-44" value={values.sort || '-createdAt'} onChange={(event) => updateParams({ sort: event.target.value, page: 1 })}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-8 grid gap-7 lg:grid-cols-[280px_minmax(0,1fr)]">
          <FilterPanel values={values} onChange={updateParams} onClear={clearFilters} />

          <section>
            {propertiesQuery.isError ? (
              <ErrorState message={getApiErrorMessage(propertiesQuery.error, 'Failed to load listings.')} requestId={getApiErrorRequestId(propertiesQuery.error)} onRetry={() => propertiesQuery.refetch()} />
            ) : propertiesQuery.isLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <ListingCardSkeleton key={index} />
                ))}
              </div>
            ) : properties.length === 0 ? (
              <EmptyState title="No stays found" message="Try changing the filters that the backend supports." />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {properties.map((property) => (
                    <ListingCard
                      key={property._id}
                      property={property}
                      wishlisted={wishlistIds.has(property._id)}
                      onToggleWishlist={user ? () => wishlistMutation.mutate(property._id) : undefined}
                      isWishlistPending={wishlistMutation.isPending}
                    />
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-center gap-2">
                  <button type="button" className="btn-secondary" disabled={Number(params.page) <= 1} onClick={() => updateParams({ page: Number(params.page) - 1 })}>
                    Previous
                  </button>
                  <span className="px-3 text-sm text-muted">Page {params.page} of {totalPages}</span>
                  <button type="button" className="btn-secondary" disabled={Number(params.page) >= totalPages} onClick={() => updateParams({ page: Number(params.page) + 1 })}>
                    Next
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </PageShell>

      {showMobileFilters && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-lg bg-white p-6 shadow-card">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-ink">Filters</h2>
              <button type="button" onClick={() => setShowMobileFilters(false)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-soft" aria-label="Close filters">x</button>
            </div>
            <FilterPanel values={values} onChange={updateParams} onClear={clearFilters} mobile />
            <button type="button" onClick={() => setShowMobileFilters(false)} className="btn-primary mt-6 w-full">Show {total} stays</button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Home;

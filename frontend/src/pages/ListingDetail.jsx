import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Bath, BedDouble, MapPin, MessageCircle, Star, Users } from 'lucide-react';
import { getPropertyById } from '../services/property.service.js';
import { getPropertyReviews } from '../services/review.service.js';
import { startConversation } from '../services/chat.service.js';
import Navbar from '../components/layout/Navbar.jsx';
import Gallery from '../components/listing/Gallery.jsx';
import BookingCard from '../components/listing/BookingCard.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';
import { ErrorState, PageShell, SkeletonBlock } from '../components/common/StateViews.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatAddress, formatAmenity } from '../utils/formatters.js';
import { getApiErrorMessage, getApiErrorRequestId } from '../utils/apiError.js';

const AMENITIES_PREVIEW_COUNT = 6;

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [descExpanded, setDescExpanded] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [contactError, setContactError] = useState('');

  const propertyQuery = useQuery({
    queryKey: ['property', id],
    queryFn: () => getPropertyById(id),
  });

  const reviewsQuery = useQuery({
    queryKey: ['property-reviews', id, { page: 1, limit: 6, sort: 'newest' }],
    queryFn: () => getPropertyReviews(id, { page: 1, limit: 6, sort: 'newest' }),
  });

  const contactMutation = useMutation({
    mutationFn: startConversation,
    onSuccess: (res) => navigate(`/messages/${res.data?._id}`),
    onError: (err) => setContactError(getApiErrorMessage(err, 'Could not start a conversation.')),
  });

  if (propertyQuery.isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <PageShell>
          <SkeletonBlock className="mb-4 h-7 w-1/3" />
          <SkeletonBlock className="mb-8 aspect-[16/9] w-full" />
          <SkeletonBlock className="mb-3 h-5 w-2/3" />
          <SkeletonBlock className="h-5 w-1/2" />
        </PageShell>
      </div>
    );
  }

  if (propertyQuery.isError || !propertyQuery.data?.data) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <PageShell>
          <ErrorState message={getApiErrorMessage(propertyQuery.error, 'Listing not found.')} requestId={getApiErrorRequestId(propertyQuery.error)} onRetry={() => propertyQuery.refetch()} />
        </PageShell>
      </div>
    );
  }

  const property = propertyQuery.data.data;
  const amenitiesToShow = showAllAmenities
    ? property.amenities
    : property.amenities?.slice(0, AMENITIES_PREVIEW_COUNT);
  const isOwnProperty = user?._id && String(property.host?._id) === String(user._id);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <PageShell>
        <h1 className="mb-2 text-[22px] font-medium leading-[1.18] text-ink">
          {property.title}
        </h1>
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-ink">
          {property.averageRating > 0 && (
            <span className="flex items-center gap-1 font-medium">
              <Star className="h-3.5 w-3.5 fill-ink text-ink" />
              {property.averageRating.toFixed(2)} · {property.totalReviews} reviews
            </span>
          )}
          <span className="text-muted">·</span>
          <span className="flex items-center gap-1 text-ink underline">
            <MapPin className="h-3.5 w-3.5" />
            {formatAddress(property.address)}
          </span>
        </div>

        <Gallery images={property.images} />

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between gap-4 border-b border-hairline pb-6">
              <div>
                <h2 className="text-[20px] font-semibold text-ink">Hosted by {property.host?.name}</h2>
                <p className="mt-1 text-sm capitalize text-muted">{property.type}</p>
              </div>
              <div className="flex items-center gap-3">
                {!isOwnProperty && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) return navigate('/login');
                      contactMutation.mutate({ recipientId: property.host?._id, propertyId: property._id });
                    }}
                    className="btn-secondary"
                    disabled={contactMutation.isPending}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Contact
                  </button>
                )}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-strong text-sm font-medium text-muted">
                  {property.host?.name?.[0]?.toUpperCase()}
                </div>
              </div>
            </div>
            {contactError && <p className="mt-3 text-sm text-error">{contactError}</p>}

            <div className="space-y-4 border-b border-hairline py-6">
              <div className="flex items-center gap-3 text-ink">
                <Users className="h-5 w-5 text-muted" />
                <span>{property.maxGuests} guests</span>
              </div>
              <div className="flex items-center gap-3 text-ink">
                <BedDouble className="h-5 w-5 text-muted" />
                <span>{property.bedrooms} bedrooms</span>
              </div>
              <div className="flex items-center gap-3 text-ink">
                <Bath className="h-5 w-5 text-muted" />
                <span>{property.bathrooms} bathrooms</span>
              </div>
            </div>

            <div className="border-b border-hairline py-6">
              <p className={`leading-7 text-body ${!descExpanded ? 'line-clamp-3' : ''}`}>
                {property.description}
              </p>
              {property.description?.length > 180 && (
                <button
                  type="button"
                  onClick={() => setDescExpanded((value) => !value)}
                  className="mt-2 text-sm font-semibold text-ink underline"
                >
                  {descExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>

            {property.amenities?.length > 0 && (
              <div className="py-6">
                <h3 className="mb-4 text-[21px] font-bold text-ink">What this place offers</h3>
                <div className="grid gap-x-4 sm:grid-cols-2">
                  {amenitiesToShow.map((amenity) => (
                    <div key={amenity} className="border-t border-hairline py-3 text-base text-ink">
                      {formatAmenity(amenity)}
                    </div>
                  ))}
                </div>
                {property.amenities.length > AMENITIES_PREVIEW_COUNT && (
                  <button
                    type="button"
                    onClick={() => setShowAllAmenities((value) => !value)}
                    className="btn-secondary mt-4"
                  >
                    {showAllAmenities ? 'Show less' : `Show all ${property.amenities.length} amenities`}
                  </button>
                )}
              </div>
            )}

            <section className="border-t border-hairline py-6">
              <h3 className="mb-4 text-[21px] font-bold text-ink">Reviews</h3>
              {reviewsQuery.isLoading ? (
                <div className="space-y-3">
                  <SkeletonBlock className="h-20 w-full" />
                  <SkeletonBlock className="h-20 w-full" />
                </div>
              ) : reviewsQuery.isError ? (
                <p className="text-sm text-error">{getApiErrorMessage(reviewsQuery.error, 'Could not load reviews.')}</p>
              ) : (reviewsQuery.data?.data || []).length === 0 ? (
                <p className="text-sm text-muted">No reviews yet.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {reviewsQuery.data.data.map((review) => (
                    <article key={review._id} className="rounded-sm border border-hairline p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-ink">{review.reviewer?.name || 'Guest'}</p>
                        <span className="flex items-center gap-1 text-sm text-ink">
                          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                          {review.rating}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-body">{review.comment}</p>
                      {review.hostResponse?.comment && (
                        <div className="mt-3 rounded-sm bg-surface-soft p-3 text-sm text-body">
                          <span className="font-semibold text-ink">Host response: </span>
                          {review.hostResponse.comment}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div>
            <BookingCard property={property} />
          </div>
        </div>
      </PageShell>
      <BottomNav />
    </div>
  );
};

export default ListingDetail;

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Navbar from '../components/layout/Navbar.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';
import ListingCard from '../components/listing/ListingCard.jsx';
import { EmptyState, ErrorState, PageShell, SkeletonBlock } from '../components/common/StateViews.jsx';
import { getWishlist, toggleWishlist } from '../services/property.service.js';
import { getApiErrorMessage, getApiErrorRequestId } from '../utils/apiError.js';

const WishlistPage = () => {
  const queryClient = useQueryClient();

  const wishlistQuery = useQuery({
    queryKey: ['wishlist'],
    queryFn: getWishlist,
  });

  const wishlistMutation = useMutation({
    mutationFn: toggleWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });

  const properties = wishlistQuery.data?.data || [];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <PageShell className="max-w-[1240px]">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-ink">Wishlist</h1>
          <p className="mt-1 text-sm text-muted">Saved stays from your Roomify account.</p>
        </div>

        {wishlistMutation.isError && (
          <div className="mb-5 rounded-sm border border-[#f3b6a8] bg-[#fff4f1] px-3 py-2 text-sm text-error" role="alert">
            {getApiErrorMessage(wishlistMutation.error, 'Could not update wishlist.')}
          </div>
        )}

        {wishlistQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <ListingCardSkeleton key={index} />)}
          </div>
        ) : wishlistQuery.isError ? (
          <ErrorState
            message={getApiErrorMessage(wishlistQuery.error, 'Could not load wishlist.')}
            requestId={getApiErrorRequestId(wishlistQuery.error)}
            onRetry={() => wishlistQuery.refetch()}
          />
        ) : properties.length === 0 ? (
          <EmptyState title="No saved stays yet" message="Save properties you want to revisit later." />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <ListingCard
                key={property._id}
                property={property}
                wishlisted
                onToggleWishlist={() => wishlistMutation.mutate(property._id)}
                isWishlistPending={wishlistMutation.isPending}
              />
            ))}
          </div>
        )}
      </PageShell>
      <BottomNav />
    </div>
  );
};

export default WishlistPage;
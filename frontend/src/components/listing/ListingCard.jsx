import { Link } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import { formatAddress, formatMoney, getCoverImage, pluralize } from '../../utils/formatters.js';

const ListingCard = ({ property, wishlisted = false, onToggleWishlist, isWishlistPending = false }) => {
  const { _id, title, price, currency, averageRating, totalReviews, bedrooms, bathrooms, maxGuests } = property;
  const coverImage = getCoverImage(property);

  const handleWishlistClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleWishlist?.(_id);
  };

  return (
    <article className="group overflow-hidden rounded-md border border-hairline-soft bg-white shadow-card transition-transform duration-200 hover:-translate-y-0.5">
      <Link to={`/listings/${_id}`} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-soft">
          {coverImage ? (
            <img
              src={coverImage}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-soft">
              No image
            </div>
          )}
          {onToggleWishlist && (
            <button
              type="button"
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-ink shadow-card transition-colors hover:text-primary disabled:opacity-60"
              aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
              aria-pressed={wishlisted}
              disabled={isWishlistPending}
              onClick={handleWishlistClick}
            >
              <Heart className={`h-5 w-5 ${wishlisted ? 'fill-primary text-primary' : ''}`} />
            </button>
          )}
        </div>

        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-ink">{title}</h3>
              <p className="truncate text-sm text-muted">{formatAddress(property.address)}</p>
            </div>
            {averageRating > 0 && (
              <span className="flex shrink-0 items-center gap-1 text-sm text-ink">
                <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                {averageRating.toFixed(1)}
                {totalReviews ? <span className="text-muted">({totalReviews})</span> : null}
              </span>
            )}
          </div>
          <p className="text-sm text-muted">
            {pluralize(maxGuests, 'guest')} &middot; {pluralize(bedrooms, 'bedroom')} &middot; {pluralize(bathrooms, 'bath')}
          </p>
          <p className="text-base text-ink">
            <span className="font-bold">{formatMoney(price, currency)}</span>
            <span className="text-sm text-muted"> / night</span>
          </p>
        </div>
      </Link>
    </article>
  );
};

export default ListingCard;
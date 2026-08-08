import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

const ListingCard = ({ property }) => {
  const { _id, title, images, price, currency, averageRating, address } = property;
  const coverImage = images?.[0]?.url;

  return (
    <Link to={`/listings/${_id}`} className="group block">
      <div className="aspect-square w-full rounded-2xl overflow-hidden bg-gray-100 relative">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
            No image
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">
            {address?.city}{address?.city && address?.country ? ', ' : ''}{address?.country}
          </p>
          {averageRating > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-700 shrink-0">
              <Star className="w-3.5 h-3.5 fill-gray-900 text-gray-900" />
              {averageRating.toFixed(1)}
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate">{title}</p>
        <p className="text-sm text-gray-900">
          <span className="font-semibold">{currency} {price}</span>{' '}
          <span className="text-gray-500">/ night</span>
        </p>
      </div>
    </Link>
  );
};

export default ListingCard;
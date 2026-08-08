const ListingCardSkeleton = () => (
  <div className="animate-pulse">
    <div className="aspect-square w-full rounded-2xl bg-gray-200" />
    <div className="mt-3 space-y-2">
      <div className="h-3.5 bg-gray-200 rounded w-3/4" />
      <div className="h-3.5 bg-gray-200 rounded w-1/2" />
      <div className="h-3.5 bg-gray-200 rounded w-1/3" />
    </div>
  </div>
);

export default ListingCardSkeleton;
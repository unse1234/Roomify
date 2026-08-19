const ListingCardSkeleton = () => (
  <div className="overflow-hidden rounded-md border border-hairline-soft bg-white shadow-card">
    <div className="aspect-[4/3] w-full animate-pulse bg-surface-soft" />
    <div className="space-y-3 p-4">
      <div className="h-4 w-3/4 animate-pulse rounded bg-surface-soft" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-surface-soft" />
      <div className="h-4 w-1/3 animate-pulse rounded bg-surface-soft" />
    </div>
  </div>
);

export default ListingCardSkeleton;

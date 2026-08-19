import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Star, Trash2 } from 'lucide-react';
import Navbar from '../components/layout/Navbar.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';
import { deleteReview, getMyReviews, updateReview } from '../services/review.service.js';
import { EmptyState, ErrorState, PageShell, SkeletonBlock } from '../components/common/StateViews.jsx';
import { formatAddress } from '../utils/formatters.js';
import { getApiErrorMessage, getApiErrorRequestId } from '../utils/apiError.js';

const ReviewsPage = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState('');
  const [draft, setDraft] = useState({ rating: 5, comment: '' });

  const reviewsQuery = useQuery({
    queryKey: ['reviews', 'mine'],
    queryFn: () => getMyReviews({ page: 1, limit: 20, sort: 'newest' }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['reviews'] });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => updateReview(id, data), onSuccess: () => { setEditingId(''); invalidate(); } });
  const deleteMutation = useMutation({ mutationFn: deleteReview, onSuccess: invalidate });
  const reviews = reviewsQuery.data?.data || [];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <PageShell>
        <h1 className="text-2xl font-semibold text-ink">My reviews</h1>
        <p className="mt-1 text-sm text-muted">Only reviews from completed backend bookings appear here.</p>

        {[updateMutation, deleteMutation].some((mutation) => mutation.isError) && (
          <p className="mt-4 text-sm text-error">{getApiErrorMessage(updateMutation.error || deleteMutation.error, 'Review action failed.')}</p>
        )}

        <div className="mt-6">
          {reviewsQuery.isLoading ? (
            <div className="space-y-4"><SkeletonBlock className="h-36" /><SkeletonBlock className="h-36" /></div>
          ) : reviewsQuery.isError ? (
            <ErrorState message={getApiErrorMessage(reviewsQuery.error, 'Could not load reviews.')} requestId={getApiErrorRequestId(reviewsQuery.error)} onRetry={() => reviewsQuery.refetch()} />
          ) : reviews.length === 0 ? (
            <EmptyState title="No reviews yet" message="After a completed stay, you can review it from the booking detail page." />
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const editing = editingId === review._id;
                const property = review.property;
                return (
                  <article key={review._id} className="rounded-md border border-hairline p-5 shadow-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link to={`/listings/${property?._id}`} className="text-lg font-semibold text-ink hover:underline">{property?.title || 'Property'}</Link>
                        <p className="mt-1 text-sm text-muted">{formatAddress(property?.address)}</p>
                      </div>
                      <span className="flex items-center gap-1 text-sm font-semibold text-ink"><Star className="h-4 w-4 fill-primary text-primary" />{review.rating}</span>
                    </div>

                    {editing ? (
                      <form onSubmit={(event) => { event.preventDefault(); updateMutation.mutate({ id: review._id, data: { rating: Number(draft.rating), comment: draft.comment } }); }} className="mt-4 grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                        <select className="field" value={draft.rating} onChange={(event) => setDraft((prev) => ({ ...prev, rating: event.target.value }))}>
                          {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating}</option>)}
                        </select>
                        <textarea className="field min-h-24" minLength={10} maxLength={1000} value={draft.comment} onChange={(event) => setDraft((prev) => ({ ...prev, comment: event.target.value }))} />
                        <div className="flex gap-2 sm:col-span-2">
                          <button className="btn-primary" type="submit" disabled={updateMutation.isPending}>Save</button>
                          <button className="btn-secondary" type="button" onClick={() => setEditingId('')}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <p className="mt-4 text-sm leading-6 text-body">{review.comment}</p>
                        <div className="mt-4 flex gap-2">
                          <button type="button" className="btn-secondary" onClick={() => { setEditingId(review._id); setDraft({ rating: review.rating, comment: review.comment }); }}>Edit</button>
                          <button type="button" className="btn-secondary text-error" onClick={() => deleteMutation.mutate(review._id)} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4" />Delete</button>
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </PageShell>
      <BottomNav />
    </div>
  );
};

export default ReviewsPage;

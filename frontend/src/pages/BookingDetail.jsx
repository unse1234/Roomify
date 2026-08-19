import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';
import { cancelBooking, confirmBooking, getBookingById } from '../services/booking.service.js';
import { createReview } from '../services/review.service.js';
import { ErrorState, PageShell, SkeletonBlock } from '../components/common/StateViews.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatAddress, formatDate, formatMoney } from '../utils/formatters.js';
import { getApiErrorMessage, getApiErrorRequestId } from '../utils/apiError.js';

const BookingDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [review, setReview] = useState({ rating: 5, comment: '' });

  const bookingQuery = useQuery({
    queryKey: ['booking', id],
    queryFn: () => getBookingById(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['booking', id] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  };

  const confirmMutation = useMutation({ mutationFn: () => confirmBooking(id), onSuccess: invalidate });
  const cancelMutation = useMutation({ mutationFn: () => cancelBooking(id, reason || undefined), onSuccess: invalidate });
  const reviewMutation = useMutation({
    mutationFn: () => createReview({ bookingId: id, rating: Number(review.rating), comment: review.comment }),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  if (bookingQuery.isLoading) {
    return <><Navbar /><PageShell><SkeletonBlock className="h-72" /></PageShell></>;
  }

  if (bookingQuery.isError || !bookingQuery.data?.data) {
    return <><Navbar /><PageShell><ErrorState message={getApiErrorMessage(bookingQuery.error, 'Booking not found.')} requestId={getApiErrorRequestId(bookingQuery.error)} onRetry={() => bookingQuery.refetch()} /></PageShell></>;
  }

  const booking = bookingQuery.data.data;
  const property = booking.property;
  const isHost = user?.roles?.includes('host') && String(booking.host?._id || booking.host) === String(user._id);
  const isGuest = String(booking.guest?._id || booking.guest) === String(user?._id);
  const canReview = isGuest && booking.status === 'completed' && !booking.isReviewed;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <PageShell>
        <Link to="/bookings" className="text-sm font-semibold text-primary">Back to bookings</Link>
        <div className="mt-4 rounded-md border border-hairline bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-ink">{property?.title || 'Booking'}</h1>
              <p className="mt-1 text-sm text-muted">{formatAddress(property?.address)}</p>
            </div>
            <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold capitalize text-ink">{booking.status}</span>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-xs font-semibold uppercase text-muted">Check-in</dt><dd className="mt-1 text-ink">{formatDate(booking.checkIn)}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-muted">Check-out</dt><dd className="mt-1 text-ink">{formatDate(booking.checkOut)}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-muted">Guests</dt><dd className="mt-1 text-ink">{booking.guestCount}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-muted">Total</dt><dd className="mt-1 font-semibold text-ink">{formatMoney(booking.priceBreakdown?.totalAmount, booking.priceBreakdown?.currency || property?.currency)}</dd></div>
          </dl>

          {booking.specialRequests && <p className="mt-6 rounded-sm bg-surface-soft p-4 text-sm text-body">{booking.specialRequests}</p>}

          <div className="mt-6 flex flex-wrap gap-3">
            {isHost && booking.status === 'pending' && <button type="button" className="btn-primary" onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>Confirm booking</button>}
            {!['completed', 'cancelled'].includes(booking.status) && <button type="button" className="btn-secondary text-error" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>Cancel booking</button>}
          </div>

          <label className="mt-4 block max-w-xl">
            <span className="mb-1 block text-xs font-semibold text-muted">Cancellation reason</span>
            <input className="field" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optional" />
          </label>

          {[confirmMutation, cancelMutation, reviewMutation].some((mutation) => mutation.isError) && (
            <p className="mt-4 text-sm text-error">
              {getApiErrorMessage(confirmMutation.error || cancelMutation.error || reviewMutation.error, 'Action failed.')}
            </p>
          )}
        </div>

        {canReview && (
          <form onSubmit={(event) => { event.preventDefault(); reviewMutation.mutate(); }} className="mt-6 rounded-md border border-hairline p-6">
            <h2 className="text-xl font-semibold text-ink">Review this stay</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
              <label>
                <span className="mb-1 block text-xs font-semibold text-muted">Rating</span>
                <select className="field" value={review.rating} onChange={(event) => setReview((prev) => ({ ...prev, rating: event.target.value }))}>
                  {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-muted">Comment</span>
                <textarea className="field min-h-24" minLength={10} maxLength={1000} value={review.comment} onChange={(event) => setReview((prev) => ({ ...prev, comment: event.target.value }))} required />
              </label>
            </div>
            <button type="submit" className="btn-primary mt-4" disabled={reviewMutation.isPending}>Submit review</button>
          </form>
        )}
      </PageShell>
      <BottomNav />
    </div>
  );
};

export default BookingDetail;

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar.jsx';
import { confirmBooking, cancelBooking, getHostBookings } from '../services/booking.service.js';
import { EmptyState, ErrorState, PageShell, SkeletonBlock } from '../components/common/StateViews.jsx';
import { formatAddress, formatDate, formatMoney } from '../utils/formatters.js';
import { getApiErrorMessage, getApiErrorRequestId } from '../utils/apiError.js';

const statuses = ['', 'pending', 'confirmed', 'completed', 'cancelled'];

const HostBookingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || '';
  const page = Number(searchParams.get('page') || 1);
  const queryClient = useQueryClient();

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'host', { status, page }],
    queryFn: () => getHostBookings({ status: status || undefined, page, limit: 10 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['bookings'] });
  const confirmMutation = useMutation({ mutationFn: confirmBooking, onSuccess: invalidate });
  const cancelMutation = useMutation({ mutationFn: (id) => cancelBooking(id, 'Cancelled by host'), onSuccess: invalidate });
  const bookings = bookingsQuery.data?.data || [];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <PageShell>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Host bookings</h1>
            <p className="mt-1 text-sm text-muted">Confirm or cancel real booking requests from guests.</p>
          </div>
          <select className="field max-w-48" value={status} onChange={(event) => setSearchParams(event.target.value ? { status: event.target.value } : {})}>
            {statuses.map((item) => <option key={item || 'all'} value={item}>{item || 'All statuses'}</option>)}
          </select>
        </div>

        {[confirmMutation, cancelMutation].some((mutation) => mutation.isError) && (
          <p className="mb-4 text-sm text-error">{getApiErrorMessage(confirmMutation.error || cancelMutation.error, 'Booking action failed.')}</p>
        )}

        {bookingsQuery.isLoading ? (
          <div className="space-y-4"><SkeletonBlock className="h-40" /><SkeletonBlock className="h-40" /></div>
        ) : bookingsQuery.isError ? (
          <ErrorState message={getApiErrorMessage(bookingsQuery.error, 'Could not load host bookings.')} requestId={getApiErrorRequestId(bookingsQuery.error)} onRetry={() => bookingsQuery.refetch()} />
        ) : bookings.length === 0 ? (
          <EmptyState title="No host bookings" message="Guest booking requests for your properties will appear here." />
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <article key={booking._id} className="rounded-md border border-hairline p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">{booking.property?.title || 'Property'}</h2>
                    <p className="mt-1 text-sm text-muted">{formatAddress(booking.property?.address)}</p>
                    <p className="mt-2 text-sm text-body">
                      {formatDate(booking.checkIn)} to {formatDate(booking.checkOut)} · {booking.guestCount} guests
                    </p>
                    <p className="mt-1 text-sm text-muted">Guest: {booking.guest?.name || booking.guest?.email || 'Guest'}</p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold capitalize text-ink">{booking.status}</span>
                    <p className="mt-3 font-semibold text-ink">{formatMoney(booking.priceBreakdown?.totalAmount, booking.priceBreakdown?.currency)}</p>
                  </div>
                </div>
                {booking.status === 'pending' && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button type="button" className="btn-primary" onClick={() => confirmMutation.mutate(booking._id)} disabled={confirmMutation.isPending}>Confirm</button>
                    <button type="button" className="btn-secondary text-error" onClick={() => cancelMutation.mutate(booking._id)} disabled={cancelMutation.isPending}>Cancel</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </PageShell>
    </div>
  );
};

export default HostBookingsPage;

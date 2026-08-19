import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarX } from 'lucide-react';
import Navbar from '../components/layout/Navbar.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';
import { cancelBooking, getMyBookings } from '../services/booking.service.js';
import { EmptyState, ErrorState, PageShell, SkeletonBlock } from '../components/common/StateViews.jsx';
import { formatAddress, formatDate, formatMoney, getCoverImage } from '../utils/formatters.js';
import { getApiErrorMessage, getApiErrorRequestId } from '../utils/apiError.js';

const statuses = ['', 'pending', 'confirmed', 'completed', 'cancelled'];

const BookingRow = ({ booking, onCancel, isCancelling }) => {
  const property = booking.property;
  const cover = getCoverImage(property);

  return (
    <article className="grid gap-4 rounded-md border border-hairline bg-white p-4 shadow-card sm:grid-cols-[180px_minmax(0,1fr)]">
      <Link to={`/bookings/${booking._id}`} className="aspect-[4/3] overflow-hidden rounded-sm bg-surface-soft">
        {cover ? <img src={cover} alt={property?.title} className="h-full w-full object-cover" loading="lazy" /> : null}
      </Link>
      <div className="flex flex-col gap-3">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <Link to={`/bookings/${booking._id}`} className="text-lg font-semibold text-ink hover:underline">
              {property?.title || 'Property'}
            </Link>
            <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold capitalize text-ink">{booking.status}</span>
          </div>
          <p className="mt-1 text-sm text-muted">{formatAddress(property?.address)}</p>
          <p className="mt-2 text-sm text-body">{formatDate(booking.checkIn)} to {formatDate(booking.checkOut)} · {booking.guestCount} guests</p>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-ink">{formatMoney(booking.priceBreakdown?.totalAmount, booking.priceBreakdown?.currency || property?.currency)}</p>
          {!['completed', 'cancelled'].includes(booking.status) && (
            <button type="button" className="btn-secondary text-error" onClick={() => onCancel(booking._id)} disabled={isCancelling}>
              <CalendarX className="h-4 w-4" />
              Cancel
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

const BookingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || '';
  const page = Number(searchParams.get('page') || 1);
  const queryClient = useQueryClient();

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'guest', { status, page }],
    queryFn: () => getMyBookings({ status: status || undefined, page, limit: 10 }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => cancelBooking(id, 'Cancelled by guest'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });

  const bookings = bookingsQuery.data?.data || [];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <PageShell>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">My bookings</h1>
            <p className="mt-1 text-sm text-muted">Bookings come from the Roomify backend.</p>
          </div>
          <select className="field max-w-48" value={status} onChange={(event) => setSearchParams(event.target.value ? { status: event.target.value } : {})}>
            {statuses.map((item) => <option key={item || 'all'} value={item}>{item || 'All statuses'}</option>)}
          </select>
        </div>

        {cancelMutation.isError && <p className="mb-4 text-sm text-error">{getApiErrorMessage(cancelMutation.error, 'Could not cancel booking.')}</p>}

        {bookingsQuery.isLoading ? (
          <div className="space-y-4"><SkeletonBlock className="h-44" /><SkeletonBlock className="h-44" /></div>
        ) : bookingsQuery.isError ? (
          <ErrorState message={getApiErrorMessage(bookingsQuery.error, 'Could not load bookings.')} requestId={getApiErrorRequestId(bookingsQuery.error)} onRetry={() => bookingsQuery.refetch()} />
        ) : bookings.length === 0 ? (
          <EmptyState title="No bookings yet" message="When you book a stay, it will appear here." action={<Link to="/" className="btn-primary">Explore stays</Link>} />
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <BookingRow key={booking._id} booking={booking} onCancel={cancelMutation.mutate} isCancelling={cancelMutation.isPending} />
            ))}
          </div>
        )}
      </PageShell>
      <BottomNav />
    </div>
  );
};

export default BookingsPage;

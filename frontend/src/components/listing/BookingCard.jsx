import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { checkAvailability, createBooking } from '../../services/booking.service.js';
import { getApiErrorMessage } from '../../utils/apiError.js';
import { formatMoney } from '../../utils/formatters.js';
import Button from '../common/Button.jsx';

const SERVICE_FEE_PERCENT = 0.05;
const today = () => new Date().toISOString().slice(0, 10);

const BookingCard = ({ property }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [error, setError] = useState('');

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diff = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);
    return diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  const subtotal = nights * property.price;
  const serviceFee = Math.round(subtotal * SERVICE_FEE_PERCENT);
  const total = subtotal + serviceFee;
  const canCheckAvailability = Boolean(property?._id && checkIn && checkOut && nights > 0);

  const availabilityQuery = useQuery({
    queryKey: ['availability', property._id, checkIn, checkOut],
    queryFn: () => checkAvailability({ propertyId: property._id, checkIn, checkOut }),
    enabled: canCheckAvailability,
    retry: 0,
  });

  const bookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
      navigate(`/bookings/${res.data?._id}`);
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Could not create booking. Please try again.')),
  });

  const handleReserve = () => {
    setError('');
    if (!user) return navigate('/login');
    if (!checkIn || !checkOut) return setError('Please select check-in and check-out dates.');
    if (nights <= 0) return setError('Check-out must be after check-in.');
    if (guestCount > property.maxGuests) return setError(`This property allows up to ${property.maxGuests} guests.`);
    if (availabilityQuery.data?.available === false) return setError(availabilityQuery.data.message);

    bookingMutation.mutate({
      propertyId: property._id,
      checkIn,
      checkOut,
      guestCount,
      specialRequests: specialRequests.trim() || undefined,
    });
  };

  return (
    <div className="sticky top-28 rounded-md border border-hairline bg-white p-6 shadow-card">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <span className="text-xl font-bold text-ink">{formatMoney(property.price, property.currency)}</span>
          <span className="text-sm text-muted"> night</span>
        </div>
        {property.averageRating > 0 && (
          <span className="flex items-center gap-1 text-sm text-ink">
            <Star className="h-3.5 w-3.5 fill-ink text-ink" />
            {property.averageRating.toFixed(2)} · {property.totalReviews}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-[#f3b6a8] bg-[#fff4f1] px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      <div className="mb-3 overflow-hidden rounded-sm border border-hairline">
        <div className="grid grid-cols-2 divide-x divide-hairline">
          <label className="block p-3">
            <span className="mb-1 block text-[10px] font-semibold uppercase text-muted">Check-in</span>
            <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full text-sm outline-none" min={today()} />
          </label>
          <label className="block p-3">
            <span className="mb-1 block text-[10px] font-semibold uppercase text-muted">Check-out</span>
            <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full text-sm outline-none" min={checkIn || today()} />
          </label>
        </div>
        <label className="block border-t border-hairline p-3">
          <span className="mb-1 block text-[10px] font-semibold uppercase text-muted">Guests</span>
          <input
            type="number"
            min={1}
            max={property.maxGuests}
            value={guestCount}
            onChange={(e) => setGuestCount(Number(e.target.value))}
            className="w-full text-sm outline-none"
          />
        </label>
      </div>

      {availabilityQuery.isFetching && <p className="mb-3 text-sm text-muted">Checking availability...</p>}
      {availabilityQuery.data?.available && <p className="mb-3 text-sm font-medium text-green-700">{availabilityQuery.data.message}</p>}
      {availabilityQuery.data?.available === false && <p className="mb-3 text-sm font-medium text-error">{availabilityQuery.data.message}</p>}

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-semibold text-muted">Special requests</span>
        <textarea
          value={specialRequests}
          onChange={(event) => setSpecialRequests(event.target.value)}
          className="field min-h-20 resize-y"
          maxLength={500}
          placeholder="Optional"
        />
      </label>

      <Button onClick={handleReserve} isLoading={bookingMutation.isPending} disabled={availabilityQuery.data?.available === false}>
        {user ? 'Reserve' : 'Log in to book'}
      </Button>

      {nights > 0 && (
        <div className="mt-4 space-y-2 text-sm text-body">
          <div className="flex justify-between">
            <span>{formatMoney(property.price, property.currency)} x {nights} night{nights > 1 ? 's' : ''}</span>
            <span>{formatMoney(subtotal, property.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Service fee</span>
            <span>{formatMoney(serviceFee, property.currency)}</span>
          </div>
          <div className="flex justify-between border-t border-hairline pt-3 font-semibold text-ink">
            <span>Total</span>
            <span>{formatMoney(total, property.currency)}</span>
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-muted-soft">
        Payment processing is a backend gap. The booking request still uses the real Roomify booking API.
      </p>
    </div>
  );
};

export default BookingCard;

// controllers/booking.controller.js
import mongoose from 'mongoose';
import Booking  from '../models/booking.model.js';
import Property from '../models/property.model.js';
import {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  CANCELLED_BY,
  ACTIVE_BOOKING_STATUSES,
  TERMINAL_BOOKING_STATUSES,
  BOOKING_CONFIG,
} from '../config/booking.config.js';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PRIVATE HELPERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Calculates the number of nights between two dates.
 * @param {Date} checkIn
 * @param {Date} checkOut
 * @returns {number} nights
 */
const getNights = (checkIn, checkOut) =>
  Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

/**
 * Builds a price breakdown snapshot at the time of booking.
 * Snapshotting prevents price drift if host updates listing price later.
 * @param {number} pricePerNight
 * @param {number} nights
 * @param {string} currency
 * @returns {object} priceBreakdown
 */
const buildPriceBreakdown = (pricePerNight, nights, currency) => {
  const subtotal   = pricePerNight * nights;
  const serviceFee = Math.round(subtotal * BOOKING_CONFIG.SERVICE_FEE_PERCENT);
  return {
    basePrice:   pricePerNight,
    nights,
    subtotal,
    serviceFee,
    totalAmount: subtotal + serviceFee,
    currency,
  };
};

/**
 * Checks for date conflicts on a property.
 * Uses compound index { property, checkIn, checkOut } for O(log n) lookup.
 *
 * Overlap condition (De Morgan):
 *   existing.checkIn  < requested.checkOut
 *   existing.checkOut > requested.checkIn
 *
 * @param {string}  propertyId
 * @param {Date}    checkIn
 * @param {Date}    checkOut
 * @param {string}  [excludeBookingId]  - exclude self when rescheduling
 * @param {object}  [session]           - mongoose session for transactions
 * @returns {object|null} conflicting booking or null
 */
const findDateConflict = async (
  propertyId,
  checkIn,
  checkOut,
  excludeBookingId = null,
  session          = null
) => {
  const query = {
    property: propertyId,
    status:   { $in: ACTIVE_BOOKING_STATUSES },
    checkIn:  { $lt: checkOut },
    checkOut: { $gt: checkIn },
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  return Booking.findOne(query).session(session).lean();
};

/**
 * Determines who is performing the cancellation.
 * @param {object} booking
 * @param {object} user
 * @returns {string} CANCELLED_BY value
 */
const resolveCancelledBy = (booking, user) => {
  const userId = user._id.toString();
  if (userId === booking.guest.toString()) return CANCELLED_BY.GUEST;
  if (userId === booking.host.toString())  return CANCELLED_BY.HOST;
  return CANCELLED_BY.ADMIN;
};

/**
 * Checks whether a user is authorized to access a booking.
 * Participants: the guest, the host, or an admin.
 * @param {object} booking
 * @param {object} user
 * @returns {boolean}
 */
const isParticipant = (booking, user) =>
  booking.guest._id.toString() === user._id.toString() ||
  booking.host._id.toString() === user._id.toString() ||
  user.hasRole('admin');

/**
 * Standard populate config reused across multiple controllers.
 * Centralized here so a field change doesn't require edits in N places.
 */
const BOOKING_POPULATE = [
  { path: 'property', select: 'title address images price currency' },
  { path: 'guest',    select: 'name email' },
  { path: 'host',     select: 'name email' },
];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CONTROLLERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€â”€ @route   POST /api/bookings
// â”€â”€â”€ @access  Private â€” guest
// â”€â”€â”€ @note    Uses MongoDB transaction for atomic conflict-check + create.
//              Without a transaction, two concurrent requests could both pass
//              the conflict check and create overlapping bookings (race condition).
export const createBooking = async (req, res) => {
  const { propertyId, checkIn, checkOut, guestCount, specialRequests } = req.body;

  const checkInDate  = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  // â”€â”€ Fetch & validate property â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const property = await Property.findById(propertyId).lean();

  if (!property) {
    return res.status(404).json({
      success: false,
      message: 'Property not found',
    });
  }

  if (property.status !== 'active') {
    return res.status(400).json({
      success: false,
      message: 'This property is not available for booking',
    });
  }

  // Host cannot book their own property
  if (property.host.toString() === req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You cannot book your own property',
    });
  }

  // Guest count must not exceed property's max
  if (guestCount > property.maxGuests) {
    return res.status(400).json({
      success: false,
      message: `This property accommodates a maximum of ${property.maxGuests} guests`,
    });
  }

  // â”€â”€ Atomic conflict check + booking creation via transaction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // A session-based transaction ensures no two bookings for the same dates
  // are created concurrently (race condition prevention).
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Re-check for conflicts inside the transaction
    const conflict = await findDateConflict(
      propertyId,
      checkInDate,
      checkOutDate,
      null,
      session
    );

    if (conflict) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: 'Property is already booked for the selected dates',
        conflict: {
          checkIn:  conflict.checkIn,
          checkOut: conflict.checkOut,
        },
      });
    }

    // Build price snapshot
    const nights         = getNights(checkInDate, checkOutDate);
    const priceBreakdown = buildPriceBreakdown(
      property.price,
      nights,
      property.currency
    );

    // Create booking within the transaction
    const [booking] = await Booking.create(
      [
        {
          property:        propertyId,
          guest:           req.user._id,
          host:            property.host, // denormalized for host dashboard queries
          checkIn:         checkInDate,
          checkOut:        checkOutDate,
          guestCount,
          priceBreakdown,
          specialRequests: specialRequests ?? null,
          status:          BOOKING_STATUS.PENDING,
          paymentStatus:   PAYMENT_STATUS.UNPAID,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    // Populate after commit â€” no need to hold the transaction open during populate
    await booking.populate(BOOKING_POPULATE);

    return res.status(201).json({ success: true, data: booking });
  } catch (err) {
    await session.abortTransaction();
    throw err; // Express 5 forwards to global error handler
  } finally {
    session.endSession();
  }
};

// â”€â”€â”€ @route   GET /api/bookings/check-availability
// â”€â”€â”€ @access  Public
export const checkAvailability = async (req, res) => {
  const { propertyId, checkIn, checkOut } = req.validated.query;

  // Property existence check â€” lightweight
  const propertyExists = await Property.exists({ _id: propertyId, status: 'active' });
  if (!propertyExists) {
    return res.status(404).json({ success: false, message: 'Property not found' });
  }

  const conflict = await findDateConflict(
    propertyId,
    new Date(checkIn),
    new Date(checkOut)
  );

  return res.status(200).json({
    success:   true,
    available: !conflict,
    message:   conflict
      ? 'Property is not available for the selected dates'
      : 'Property is available for the selected dates',
  });
};

// â”€â”€â”€ @route   GET /api/bookings/my-bookings
// â”€â”€â”€ @access  Private â€” guest
export const getMyBookings = async (req, res) => {
  const { page, limit, status } = req.query;

  const filter = { guest: req.user._id };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('property', 'title address images price currency')
      .populate('host', 'name email')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .lean(),
    Booking.countDocuments(filter),
  ]);

  return res.status(200).json({
    success:    true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    count:      bookings.length,
    data:       bookings,
  });
};

// â”€â”€â”€ @route   GET /api/bookings/host-bookings
// â”€â”€â”€ @access  Private â€” host
export const getHostBookings = async (req, res) => {
  const { page, limit, status } = req.query;

  const filter = { host: req.user._id };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('property', 'title address images')
      .populate('guest', 'name email')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .lean(),
    Booking.countDocuments(filter),
  ]);

  return res.status(200).json({
    success:    true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    count:      bookings.length,
    data:       bookings,
  });
};

// â”€â”€â”€ @route   GET /api/bookings/:id
// â”€â”€â”€ @access  Private â€” guest, host, admin
export const getBookingById = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid booking ID' });
  }

  const booking = await Booking.findById(req.params.id).populate(BOOKING_POPULATE);

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  if (!isParticipant(booking, req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this booking',
    });
  }

  return res.status(200).json({ success: true, data: booking });
};

// â”€â”€â”€ @route   PATCH /api/bookings/:id/confirm
// â”€â”€â”€ @access  Private â€” host
// â”€â”€â”€ @note    Re-checks for conflicts inside a transaction before confirming.
//              Handles the race condition where two hosts try to confirm
//              overlapping bookings for the same property simultaneously.
export const confirmBooking = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid booking ID' });
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  if (booking.host.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Only the property host can confirm this booking',
    });
  }

  if (booking.status !== BOOKING_STATUS.PENDING) {
    return res.status(400).json({
      success: false,
      message: `Cannot confirm a booking with status "${booking.status}"`,
    });
  }

  // â”€â”€ Transaction-safe confirmation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Re-check conflicts excluding this booking (it was pending, not confirmed yet)
    const conflict = await findDateConflict(
      booking.property,
      booking.checkIn,
      booking.checkOut,
      booking._id,
      session
    );

    if (conflict) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: 'These dates are no longer available â€” another booking was confirmed first',
      });
    }

    booking.status = BOOKING_STATUS.CONFIRMED;
    await booking.save({ session });

    await session.commitTransaction();

    return res.status(200).json({ success: true, data: booking });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// â”€â”€â”€ @route   PATCH /api/bookings/:id/cancel
// â”€â”€â”€ @access  Private â€” guest, host, admin
export const cancelBooking = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid booking ID' });
  }

  const { reason } = req.body;
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  if (!isParticipant(booking, req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to cancel this booking',
    });
  }

  if (TERMINAL_BOOKING_STATUSES.includes(booking.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot cancel a booking with status "${booking.status}"`,
    });
  }

  const cancelledBy = resolveCancelledBy(booking, req.user);

  booking.status       = BOOKING_STATUS.CANCELLED;
  booking.cancellation = {
    cancelledBy,
    reason:      reason ?? null,
    cancelledAt: new Date(),
    // â”€â”€ Stripe integration point â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // When Stripe is added:
    // 1. Call stripe.refunds.create({ payment_intent: booking.paymentIntentId })
    // 2. Store result.id in refundId and result.amount in refundAmount
    // 3. Update paymentStatus accordingly
    refundAmount: 0,
    refundId:     null,
  };

  // Mark for refund if payment was already captured
  if (booking.paymentStatus === PAYMENT_STATUS.PAID) {
    booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
    // Stripe refund trigger will live here when payments are integrated.
  }

  await booking.save();

  return res.status(200).json({ success: true, data: booking });
};

// â”€â”€â”€ @route   PATCH /api/bookings/:id/complete
// â”€â”€â”€ @access  Private â€” admin
// â”€â”€â”€ @note    In production this should be triggered by a scheduled cron job
//              (e.g. node-cron) that runs at midnight and auto-completes all
//              confirmed bookings where checkOut < now.
//              This manual route exists for admin overrides and testing.
export const completeBooking = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid booking ID' });
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  if (booking.status !== BOOKING_STATUS.CONFIRMED) {
    return res.status(400).json({
      success: false,
      message: `Only confirmed bookings can be completed. Current status: "${booking.status}"`,
    });
  }

  if (new Date() < new Date(booking.checkOut)) {
    return res.status(400).json({
      success: false,
      message: 'Booking cannot be completed before the check-out date has passed',
    });
  }

  booking.status = BOOKING_STATUS.COMPLETED;
  await booking.save();

  return res.status(200).json({ success: true, data: booking });
};

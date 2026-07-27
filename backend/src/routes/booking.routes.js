// routes/booking.routes.js
import express from 'express';
import {
  createBooking, checkAvailability,
  getMyBookings, getHostBookings,
  getBookingById, confirmBooking,
  cancelBooking, completeBooking,
} from '../controllers/booking.controllers.js';
import protect  from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createBookingSchema,
  cancelBookingSchema,
  checkAvailabilitySchema,
  paginationSchema,
} from '../validations/booking.validation.js';

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get(
  '/check-availability',
  validate(checkAvailabilitySchema, 'query'),
  checkAvailability
);

// ── Guest ─────────────────────────────────────────────────────────────────────
router.post(
  '/',
  protect,
  authorize('guest'),
  validate(createBookingSchema),
  createBooking
);

router.get(
  '/my-bookings',
  protect,
  authorize('guest'),
  validate(paginationSchema, 'query'),
  getMyBookings
);

// ── Host ──────────────────────────────────────────────────────────────────────
router.get(
  '/host-bookings',
  protect,
  authorize('host'),
  validate(paginationSchema, 'query'),
  getHostBookings
);

router.patch(
  '/:id/confirm',
  protect,
  authorize('host'),
  confirmBooking
);

// ── Shared ────────────────────────────────────────────────────────────────────
router.get('/:id', protect, getBookingById);

router.patch(
  '/:id/cancel',
  protect,
  validate(cancelBookingSchema),
  cancelBooking
);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.patch(
  '/:id/complete',
  protect,
  authorize('admin'),
  completeBooking
);

export default router;
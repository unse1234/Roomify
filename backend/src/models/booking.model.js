// models/booking.model.js

import mongoose from 'mongoose';

const { Schema } = mongoose;

// ─── Enums ────────────────────────────────────────────────────────────────────
// Single source of truth — import in controllers/services where needed

export const BOOKING_STATUS = {
  PENDING:    'pending',    // guest requested, awaiting host confirmation
  CONFIRMED:  'confirmed',  // host accepted / payment captured
  COMPLETED:  'completed',  // stay finished — review now unlocked
  CANCELLED:  'cancelled',  // cancelled by guest, host, or admin
};

export const PAYMENT_STATUS = {
  UNPAID:    'unpaid',    // booking created, payment not yet captured
  PAID:      'paid',      // payment successfully captured
  REFUNDED:  'refunded',  // payment refunded after cancellation
  PARTIALLY_REFUNDED: 'partially_refunded', // partial refund on late cancel
};

export const CANCELLED_BY = {
  GUEST: 'guest',
  HOST:  'host',
  ADMIN: 'admin',
};

// ─── Sub-schema: Price Breakdown ──────────────────────────────────────────────
// Storing breakdown at booking time prevents issues if host changes price later
// Always snapshot price at time of booking — never recalculate from property
const priceBreakdownSchema = new Schema(
  {
    basePrice:    { type: Number, required: true }, // price per night at booking time
    nights:       { type: Number, required: true }, // total nights
    subtotal:     { type: Number, required: true }, // basePrice * nights
    serviceFee:   { type: Number, required: true }, // platform fee (e.g. 5%)
    totalAmount:  { type: Number, required: true }, // subtotal + serviceFee
    currency:     { type: String, required: true, default: 'PKR' },
  },
  { _id: false }
);

// ─── Sub-schema: Cancellation Details ────────────────────────────────────────
const cancellationSchema = new Schema(
  {
    cancelledBy:  {
      type: String,
      enum: Object.values(CANCELLED_BY),
    },
    reason:       { type: String, trim: true, maxlength: 500 },
    cancelledAt:  { type: Date },

    // Refund tracking — populated when Stripe refund is processed
    refundAmount: { type: Number, default: 0 },
    refundId:     { type: String, default: null }, // Stripe refund ID
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────
const bookingSchema = new Schema(
  {
    // ── Core References ──────────────────────────────────────────────────────
    property: {
      type:     Schema.Types.ObjectId,
      ref:      'Property',
      required: [true, 'Property reference is required'],
    },
    guest: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Guest reference is required'],
    },

    // Denormalized host ref — avoids populating property just to get host
    // Critical for host dashboard queries (filter bookings by host directly)
    host: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Host reference is required'],
    },

    // ── Stay Dates ────────────────────────────────────────────────────────────
    checkIn: {
      type:     Date,
      required: [true, 'Check-in date is required'],
    },
    checkOut: {
      type:     Date,
      required: [true, 'Check-out date is required'],
    },

    // ── Guest Count ───────────────────────────────────────────────────────────
    guestCount: {
      type:     Number,
      required: [true, 'Guest count is required'],
      min:      [1, 'At least 1 guest is required'],
    },

    // ── Pricing ───────────────────────────────────────────────────────────────
    // Full breakdown snapshotted at booking time
    priceBreakdown: {
      type:     priceBreakdownSchema,
      required: true,
    },

    // ── Status Pipeline ───────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
    },

    // ── Payment ───────────────────────────────────────────────────────────────
    paymentStatus: {
      type:    String,
      enum:    Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.UNPAID,
    },

    // Stripe payment intent ID — stored for refund processing
    // null until payment is initiated
    paymentIntentId: {
      type:    String,
      default: null,
    },

    // ── Cancellation ─────────────────────────────────────────────────────────
    cancellation: {
      type:    cancellationSchema,
      default: null,
    },

    // ── Guest Special Requests ────────────────────────────────────────────────
    specialRequests: {
      type:      String,
      trim:      true,
      maxlength: [500, 'Special requests cannot exceed 500 characters'],
      default:   null,
    },

    // ── Review Tracking ───────────────────────────────────────────────────────
    // Flipped to true when guest submits review — prevents duplicate review prompts
    isReviewed: {
      type:    Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ─── Virtuals ─────────────────────────────────────────────────────────────────

// Computed on the fly — never stored in DB
// Used in booking detail views
bookingSchema.virtual('nights').get(function () {
  if (!this.checkIn || !this.checkOut) return 0;
  const ms = this.checkOut.getTime() - this.checkIn.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
});

// ─── Validators ───────────────────────────────────────────────────────────────

// checkOut must be strictly after checkIn
// Runs on create and on save — catches invalid date ranges early
bookingSchema.pre('validate', function (next) {
  if (this.checkIn && this.checkOut) {
    if (this.checkOut <= this.checkIn) {
      this.invalidate('checkOut', 'Check-out date must be after check-in date');
    }

    // checkIn must not be in the past (only on new bookings)
    if (this.isNew && this.checkIn < new Date()) {
      this.invalidate('checkIn', 'Check-in date cannot be in the past');
    }
  }
  next();
});

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Core availability query:
// "Is this property booked between these dates?"
// Used in double-booking prevention logic in controller
bookingSchema.index({ property: 1, checkIn: 1, checkOut: 1 });

// Host dashboard: "Show me all bookings for my properties"
bookingSchema.index({ host: 1, status: 1 });

// Guest dashboard: "Show me all my bookings"
bookingSchema.index({ guest: 1, status: 1 });

// Payment lookup — used when Stripe webhook fires
bookingSchema.index({ paymentIntentId: 1 }, { sparse: true });

export default mongoose.model('Booking', bookingSchema);
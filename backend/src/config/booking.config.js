// config/booking.config.js
// ─── Booking domain constants ─────────────────────────────────────────────────
// Single source of truth — never hardcode these values in controllers

export const BOOKING_CONFIG = {
  // Platform service fee applied on top of subtotal
  SERVICE_FEE_PERCENT: 0.05,

  // Maximum guests per booking — hard ceiling regardless of property limit
  MAX_GUESTS_HARD_LIMIT: 20,

  // Pagination
  DEFAULT_PAGE_LIMIT: 10,
  MAX_PAGE_LIMIT: 50, // prevents client from dumping entire collection

  // How far in advance a booking can be made (days)
  MAX_ADVANCE_BOOKING_DAYS: 365,

  // Minimum stay duration (nights)
  MIN_NIGHTS: 1,

  // Maximum stay duration (nights)
  MAX_NIGHTS: 90,
};

export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const PAYMENT_STATUS = {
  UNPAID: "unpaid",
  PAID: "paid",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
};

export const CANCELLED_BY = {
  GUEST: "guest",
  HOST: "host",
  ADMIN: "admin",
};

// Bookings in these states are considered "active" for conflict detection
export const ACTIVE_BOOKING_STATUSES = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
];

// Bookings that cannot be transitioned further
export const TERMINAL_BOOKING_STATUSES = [
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.CANCELLED,
];

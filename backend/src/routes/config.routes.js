import express from "express";
import { BOOKING_CONFIG, BOOKING_STATUS } from "../config/booking.config.js";
import {
  PROPERTY_TYPES,
  CURRENCIES,
  AMENITIES_LIST,
} from "../models/property.model.js";

const router = express.Router();

/**
 * GET /api/config — public. Single source of truth for the domain constants
 * the client would otherwise duplicate (and drift from): the service fee
 * percentage most importantly, since a mismatch means the price shown to a
 * guest stops matching what the booking snapshots.
 */
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      serviceFeePercent: BOOKING_CONFIG.SERVICE_FEE_PERCENT,
      minNights: BOOKING_CONFIG.MIN_NIGHTS,
      maxNights: BOOKING_CONFIG.MAX_NIGHTS,
      maxAdvanceBookingDays: BOOKING_CONFIG.MAX_ADVANCE_BOOKING_DAYS,
      maxGuests: BOOKING_CONFIG.MAX_GUESTS_HARD_LIMIT,
      propertyTypes: PROPERTY_TYPES,
      currencies: CURRENCIES,
      amenities: AMENITIES_LIST,
      bookingStatuses: Object.values(BOOKING_STATUS),
    },
  });
});

export default router;

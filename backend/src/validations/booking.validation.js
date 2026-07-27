// validations/booking.validation.js
import { z } from "zod";
import mongoose from "mongoose";
import { BOOKING_CONFIG } from "../config/booking.config.js";

// ─── Reusable field definitions ───────────────────────────────────────────────

const mongoId = z
  .string({ required_error: "ID is required" })
  .refine((val) => mongoose.isValidObjectId(val), {
    message: "Invalid ID format",
  });

const futureDate = z
  .string({ required_error: "Date is required" })
  .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" })
  .refine(
    (val) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(val) >= today;
    },
    { message: "Date cannot be in the past" },
  );

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const createBookingSchema = z
  .object({
    propertyId: mongoId,

    checkIn: futureDate,

    checkOut: z
      .string({ required_error: "Check-out date is required" })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format",
      }),

    guestCount: z
      .number({ required_error: "Guest count is required" })
      .int("Guest count must be a whole number")
      .min(1, "At least 1 guest is required")
      .max(
        BOOKING_CONFIG.MAX_GUESTS_HARD_LIMIT,
        `Guest count cannot exceed ${BOOKING_CONFIG.MAX_GUESTS_HARD_LIMIT}`,
      ),

    specialRequests: z
      .string()
      .max(500, "Special requests cannot exceed 500 characters")
      .optional()
      .nullable(),
  })
  .refine((data) => new Date(data.checkOut) > new Date(data.checkIn), {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  })
  .refine(
    (data) => {
      const nights =
        (new Date(data.checkOut) - new Date(data.checkIn)) /
        (1000 * 60 * 60 * 24);
      return nights >= BOOKING_CONFIG.MIN_NIGHTS;
    },
    {
      message: `Minimum stay is ${BOOKING_CONFIG.MIN_NIGHTS} night(s)`,
      path: ["checkOut"],
    },
  )
  .refine(
    (data) => {
      const nights =
        (new Date(data.checkOut) - new Date(data.checkIn)) /
        (1000 * 60 * 60 * 24);
      return nights <= BOOKING_CONFIG.MAX_NIGHTS;
    },
    {
      message: `Maximum stay is ${BOOKING_CONFIG.MAX_NIGHTS} nights`,
      path: ["checkOut"],
    },
  )
  .refine(
    (data) => {
      const maxDate = new Date();
      maxDate.setDate(
        maxDate.getDate() + BOOKING_CONFIG.MAX_ADVANCE_BOOKING_DAYS,
      );
      return new Date(data.checkIn) <= maxDate;
    },
    {
      message: `Bookings cannot be made more than ${BOOKING_CONFIG.MAX_ADVANCE_BOOKING_DAYS} days in advance`,
      path: ["checkIn"],
    },
  );

export const cancelBookingSchema = z.object({
  reason: z
    .string()
    .max(500, "Cancellation reason cannot exceed 500 characters")
    .optional()
    .nullable(),
});

export const checkAvailabilitySchema = z
  .object({
    propertyId: mongoId,
    checkIn: futureDate,
    checkOut: z
      .string({ required_error: "Check-out date is required" })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format",
      }),
  })
  .refine((data) => new Date(data.checkOut) > new Date(data.checkIn), {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, { message: "Page must be a positive number" }),

  limit: z
    .string()
    .optional()
    .transform((val) =>
      val ? parseInt(val, 10) : BOOKING_CONFIG.DEFAULT_PAGE_LIMIT,
    )
    .refine((val) => val > 0 && val <= BOOKING_CONFIG.MAX_PAGE_LIMIT, {
      message: `Limit must be between 1 and ${BOOKING_CONFIG.MAX_PAGE_LIMIT}`,
    }),

  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
});

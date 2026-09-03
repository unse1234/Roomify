import cron from "node-cron";
import Booking from "../models/booking.model.js";
import { BOOKING_CONFIG, BOOKING_STATUS } from "../config/booking.config.js";
import { logger } from "../utils/logger.js";

/**
 * Booking lifecycle scheduler.
 *
 * Without this, no booking ever reaches `completed` (the review feature is
 * unreachable) and a `pending` request holds its dates against everyone
 * forever. Both jobs use a single atomic updateMany — no transaction, and
 * safe to run repeatedly. Every run logs how many rows it changed.
 *
 * NOTE: assumes a single API instance. If the app is ever scaled out, guard
 * each job with a database lock so it doesn't double-execute.
 */

export const autoCompleteStays = async () => {
  const now = new Date();
  const result = await Booking.updateMany(
    { status: BOOKING_STATUS.CONFIRMED, checkOut: { $lte: now } },
    { $set: { status: BOOKING_STATUS.COMPLETED } },
  );
  if (result.modifiedCount > 0) {
    logger.info("job_bookings_auto_completed", { count: result.modifiedCount });
  }
  return result.modifiedCount;
};

export const expireStalePending = async () => {
  const now = new Date();
  const cutoff = new Date(
    now.getTime() - BOOKING_CONFIG.PENDING_HOLD_HOURS * 60 * 60 * 1000,
  );

  const result = await Booking.updateMany(
    {
      status: BOOKING_STATUS.PENDING,
      $or: [{ createdAt: { $lte: cutoff } }, { checkIn: { $lte: now } }],
    },
    {
      $set: {
        status: BOOKING_STATUS.CANCELLED,
        cancellation: {
          cancelledBy: "admin",
          reason: "Automatically cancelled — not confirmed in time.",
          cancelledAt: now,
          refundAmount: 0,
          refundId: null,
        },
      },
    },
  );
  if (result.modifiedCount > 0) {
    logger.info("job_bookings_pending_expired", { count: result.modifiedCount });
  }
  return result.modifiedCount;
};

const runAll = async () => {
  try {
    await autoCompleteStays();
    await expireStalePending();
  } catch (error) {
    logger.error("job_booking_lifecycle_failed", {
      errorName: error.name,
      errorMessage: error.message,
    });
  }
};

export const startBookingJobs = () => {
  if (process.env.DISABLE_BOOKING_JOBS === "true") {
    logger.warn("booking_jobs_disabled");
    return;
  }
  // Every 15 minutes.
  cron.schedule("*/15 * * * *", runAll);
  logger.info("booking_jobs_scheduled");
  // Also run once shortly after boot so a fresh deploy catches up.
  setTimeout(runAll, 10_000).unref();
};

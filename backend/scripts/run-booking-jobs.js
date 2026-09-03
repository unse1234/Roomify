import dotenv from "dotenv";

dotenv.config();

const { default: mongoose } = await import("mongoose");
const { default: connectDB } = await import("../src/config/database.js");
const { autoCompleteStays, expireStalePending } = await import(
  "../src/jobs/bookingLifecycle.js"
);
const Booking = (await import("../src/models/booking.model.js")).default;
const { BOOKING_CONFIG, BOOKING_STATUS } = await import(
  "../src/config/booking.config.js"
);

const dryRun = process.argv.includes("--dry-run");

const run = async () => {
  await connectDB();
  const now = new Date();
  const cutoff = new Date(
    now.getTime() - BOOKING_CONFIG.PENDING_HOLD_HOURS * 60 * 60 * 1000,
  );

  const toComplete = await Booking.countDocuments({
    status: BOOKING_STATUS.CONFIRMED,
    checkOut: { $lte: now },
  });
  const toExpire = await Booking.countDocuments({
    status: BOOKING_STATUS.PENDING,
    $or: [{ createdAt: { $lte: cutoff } }, { checkIn: { $lte: now } }],
  });

  console.log(`Would auto-complete: ${toComplete}`);
  console.log(`Would auto-cancel (stale pending): ${toExpire}`);

  if (dryRun) {
    console.log("Dry run — no changes made.");
    return;
  }

  console.log(`Completed: ${await autoCompleteStays()}`);
  console.log(`Cancelled: ${await expireStalePending()}`);
};

try {
  await run();
} catch (error) {
  console.error("Booking job run failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

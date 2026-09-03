import dotenv from "dotenv";

dotenv.config();

const { default: mongoose } = await import("mongoose");
const { default: connectDB } = await import("../src/config/database.js");

// Import every model so its schema indexes are registered.
const models = {
  User: (await import("../src/models/users.model.js")).default,
  Property: (await import("../src/models/property.model.js")).default,
  Booking: (await import("../src/models/booking.model.js")).default,
  Review: (await import("../src/models/review.model.js")).default,
};
const chat = await import("../src/models/chat.model.js");
models.Conversation = chat.Conversation;
models.Message = chat.Message;

/**
 * Aligns the database indexes with what the schemas declare: creates any
 * that are missing and DROPS any that are no longer declared (Mongoose's
 * autoIndex only ever adds). Safe to re-run. Index builds run in the
 * background; on a large collection run this off-peak.
 */
const run = async () => {
  await connectDB();

  for (const [name, model] of Object.entries(models)) {
    const dropped = await model.syncIndexes({ background: true });
    const current = (await model.collection.indexes()).map((i) => i.name);
    console.log(
      `${name}: dropped [${dropped.join(", ") || "none"}] | now [${current.join(", ")}]`,
    );
  }
};

try {
  await run();
  console.log("Index sync complete.");
} catch (error) {
  console.error("Index sync failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

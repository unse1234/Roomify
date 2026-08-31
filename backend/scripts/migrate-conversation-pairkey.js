import dotenv from "dotenv";

dotenv.config();

// Loaded dynamically AFTER dotenv.config() so that src/config/config.js
// (which reads process.env at module-eval time) sees the .env values.
// Same pattern as scripts/seed.js.
const { default: mongoose } = await import("mongoose");
const { default: connectDB } = await import("../src/config/database.js");
const { Conversation } = await import("../src/models/chat.model.js");

/**
 * One-off migration for the conversation uniqueness fix.
 *
 * The old unique index { participants: 1, property: 1 } was multikey
 * (participants is an array), so it enforced "one conversation per
 * PERSON per property" instead of "one per PAIR per property". The fix
 * stores a scalar `pairKey` (sorted participant ids joined with "_")
 * and moves the unique index to { pairKey: 1, property: 1 }.
 *
 * This script:
 *   1. Backfills `pairKey` on every existing conversation.
 *   2. Drops the obsolete `participants_1_property_1` index.
 *   3. Runs syncIndexes() so the new unique index is built.
 *
 * Safe to re-run: step 1 only touches rows still missing a pairKey,
 * and steps 2-3 are no-ops once already applied.
 *
 * Run BEFORE starting the server on the new code — the new schema
 * marks `pairKey` required and .save() paths (sendMessage etc.) will
 * reject conversations that don't have it yet.
 */

const OLD_INDEX_NAME = "participants_1_property_1";
const BATCH_SIZE = 500;

const flush = async (ops) => {
  if (ops.length === 0) return 0;
  await Conversation.bulkWrite(ops, { ordered: false, timestamps: false });
  return ops.length;
};

const migrate = async () => {
  await connectDB();

  // ── 1. Backfill pairKey ────────────────────────────────────────
  const cursor = Conversation.find(
    { $or: [{ pairKey: { $exists: false } }, { pairKey: null }, { pairKey: "" }] },
    { participants: 1 },
  ).cursor();

  let backfilled = 0;
  let ops = [];

  for await (const conversation of cursor) {
    const pairKey = conversation.participants
      .map((id) => id.toString())
      .sort()
      .join("_");

    ops.push({
      updateOne: {
        filter: { _id: conversation._id },
        update: { $set: { pairKey } },
      },
    });

    if (ops.length === BATCH_SIZE) {
      backfilled += await flush(ops);
      ops = [];
    }
  }

  backfilled += await flush(ops);
  console.log(`Backfilled pairKey on ${backfilled} conversation(s).`);

  // ── 2. Drop the obsolete multikey unique index ─────────────────
  const indexes = await Conversation.collection.indexes();
  if (indexes.some((index) => index.name === OLD_INDEX_NAME)) {
    await Conversation.collection.dropIndex(OLD_INDEX_NAME);
    console.log(`Dropped obsolete index "${OLD_INDEX_NAME}".`);
  } else {
    console.log(`Index "${OLD_INDEX_NAME}" not present — nothing to drop.`);
  }

  // ── 3. Build the new { pairKey: 1, property: 1 } unique index ───
  await Conversation.syncIndexes();
  console.log("Synced Conversation indexes.");
};

try {
  await migrate();
  console.log("Migration complete.");
} catch (error) {
  console.error("Migration failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

import mongoose from "mongoose";
import { config } from "./config.js";
import { logger } from "../utils/logger.js";
import { instrumentPool } from "../utils/perf.js";

/**
 * Booking, review and chat writes use multi-document transactions, which
 * MongoDB only supports on a replica set or a sharded cluster. Against a
 * standalone mongod every one of those operations fails with a confusing
 * 500. This checks the topology once, at boot, and says exactly what is
 * wrong instead of letting it surface later as four unrelated-looking bugs.
 */
async function verifyTransactionSupport() {
  try {
    const info = await mongoose.connection.db.admin().command({ hello: 1 });
    const isReplicaSet = Boolean(info.setName);
    const isMongos = info.msg === "isdbgrid";

    if (!isReplicaSet && !isMongos) {
      logger.error("database_topology_no_transactions", {
        message:
          "MongoDB is running standalone. Bookings, reviews and chat use " +
          "transactions and WILL fail. Use a replica set (locally: run mongod " +
          "with --replSet and rs.initiate(), or use the docker-compose file) " +
          "or MongoDB Atlas.",
      });
    }
  } catch (error) {
    logger.warn("database_topology_check_failed", {
      errorName: error.name,
      errorMessage: error.message,
    });
  }
}

async function connectDB() {
  try {
    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
      maxPoolSize: config.MONGO_MAX_POOL_SIZE,
      minPoolSize: config.MONGO_MIN_POOL_SIZE,
    });
    logger.info("database_connected");
    instrumentPool(mongoose.connection.getClient());
    await verifyTransactionSupport();
  } catch (error) {
    logger.fatal("database_connection_failed", {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

export default connectDB;

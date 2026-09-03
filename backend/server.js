import dotenv from "dotenv";
dotenv.config();

import http from "http";
import mongoose from "mongoose";

const { default: app } = await import("./src/app.js");
const { config } = await import("./src/config/config.js");
const { default: connectDB } = await import("./src/config/database.js");
const { initializeSocket } = await import("./src/socket/chat.socket.js");
const { logger } = await import("./src/utils/logger.js");

await connectDB();

// Socket.io needs the raw HTTP server (not the Express app) because
// it upgrades HTTP connections to WebSocket connections directly.
const httpServer = http.createServer(app);
const io = initializeSocket(httpServer);

httpServer.listen(config.PORT, () => {
  logger.info("server_started", { port: config.PORT });
});

// ─── Graceful shutdown ──────────────────────────────────────────────────
// On deploy the platform sends SIGTERM. Stop taking new connections, let
// in-flight requests finish, close sockets and the DB, then exit. A hard
// timeout guarantees the process dies even if something hangs.
let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("shutdown_started", { signal });

  const forceExit = setTimeout(() => {
    logger.error("shutdown_forced", { signal });
    process.exit(1);
  }, 15_000);
  forceExit.unref();

  try {
    await new Promise((resolve) => httpServer.close(resolve));
    io.close();
    await mongoose.connection.close(false);
    logger.info("shutdown_complete", { signal });
    clearTimeout(forceExit);
    process.exit(0);
  } catch (error) {
    logger.error("shutdown_error", { errorName: error.name, errorMessage: error.message });
    process.exit(1);
  }
};

["SIGTERM", "SIGINT"].forEach((signal) =>
  process.on(signal, () => shutdown(signal)),
);

// ─── Last-resort process guards ─────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  logger.fatal("unhandled_rejection", {
    errorMessage: reason?.message || String(reason),
    stack: reason?.stack,
  });
  shutdown("unhandledRejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal("uncaught_exception", {
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack,
  });
  shutdown("uncaughtException");
});

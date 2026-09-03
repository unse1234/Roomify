import dotenv from "dotenv";
dotenv.config();

import http from "http";

const { default: app } = await import("./src/app.js");
const { config } = await import("./src/config/config.js");
const { default: connectDB } = await import("./src/config/database.js");
const { initializeSocket } = await import("./src/socket/chat.socket.js");
const { logger } = await import("./src/utils/logger.js");

await connectDB();

// Socket.io needs the raw HTTP server (not the Express app) because
// it upgrades HTTP connections to WebSocket connections directly —
// Express alone has no hook for that upgrade handshake.
const httpServer = http.createServer(app);
initializeSocket(httpServer);

httpServer.listen(config.PORT, () => {
  logger.info("server_started", { port: config.PORT });
});

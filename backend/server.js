import dotenv from "dotenv";
dotenv.config();

import http from "http";

const { default: app } = await import("./src/app.js");
const { default: connectDB } = await import("./src/config/database.js");
const { initializeSocket } = await import("./src/socket/chat.socket.js");

await connectDB();

// Socket.io needs the raw HTTP server (not the Express app) because
// it upgrades HTTP connections to WebSocket connections directly —
// Express alone has no hook for that upgrade handshake.
const httpServer = http.createServer(app);
initializeSocket(httpServer);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

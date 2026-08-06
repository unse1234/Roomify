import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import * as cookie from 'cookie';
let io;

/**
 * Initializes Socket.io on the existing HTTP server and wires up
 * connection handling. Called once from the main server entry file.
 */
export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  // Reuses the same JWT cookie the REST API already relies on, so
  // there's one source of truth for auth instead of a second token
  // scheme just for sockets.
  io.use((socket, next) => {
    try {
      const rawCookies = socket.handshake.headers.cookie;
      if (!rawCookies) return next(new Error('Authentication required'));

      const { token } = cookie.parse(rawCookies);
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    // Personal room — lets any controller notify this exact user
    // directly, without needing to know which conversation room
    // (if any) they currently have open.
    socket.join(`user:${socket.userId}`);

    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('typing_start', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing_start', {
        conversationId,
        userId: socket.userId,
      });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing_stop', {
        conversationId,
        userId: socket.userId,
      });
    });
  });

  return io;
};

/**
 * Lets controllers (e.g. chat.controller.js) emit events without
 * importing the raw `io` instance directly.
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet');
  }
  return io;
};
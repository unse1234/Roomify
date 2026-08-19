import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import * as cookie from 'cookie';
import User from '../models/users.model.js';
import { Conversation } from '../models/chat.model.js';
import { logger } from '../utils/logger.js';
let io;

const getConversationId = (payload) =>
  typeof payload === 'string' ? payload : payload?.conversationId;

/**
 * Initializes Socket.io on the existing HTTP server and wires up
 * connection handling. Called once from the main server entry file.
 */
export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || process.env.CLIENT_URL,
      credentials: true,
    },
  });

  // Reuses the same JWT cookie the REST API already relies on, so
  // there's one source of truth for auth instead of a second token
  // scheme just for sockets.
  io.use(async (socket, next) => {
    try {
      const rawCookies = socket.handshake.headers.cookie;
      if (!rawCookies) return next(new Error('Authentication required'));

      const { jwt: token } = cookie.parse(rawCookies);
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id').lean();
      if (!user) return next(new Error('Authentication failed'));

      socket.userId = user._id.toString();
      next();
    } catch (error) {
      logger.warn('socket_auth_failed', {
        errorName: error.name,
        errorMessage: error.message,
      });
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const authorizedConversations = new Set();

    // Personal room — lets any controller notify this exact user
    // directly, without needing to know which conversation room
    // (if any) they currently have open.
    socket.join(`user:${socket.userId}`);

    socket.on('join_conversation', async (conversationId, acknowledge) => {
      try {
        const conversation = await Conversation.findById(conversationId)
          .select('participants')
          .lean();
        const isParticipant = conversation?.participants.some(
          (participantId) => participantId.toString() === socket.userId
        );

        if (!isParticipant) {
          acknowledge?.({ success: false, message: 'Not authorized to access this conversation' });
          return;
        }

        authorizedConversations.add(conversationId.toString());
        socket.join(`conversation:${conversationId}`);
        acknowledge?.({ success: true });
      } catch (error) {
        logger.warn('socket_conversation_join_failed', {
          conversationId,
          userId: socket.userId,
          errorName: error.name,
          errorMessage: error.message,
        });
        acknowledge?.({ success: false, message: 'Unable to join conversation' });
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('typing_start', (payload) => {
      const conversationId = getConversationId(payload);
      if (!conversationId || !authorizedConversations.has(conversationId.toString())) return;
      socket.to(`conversation:${conversationId}`).emit('typing_start', {
        conversationId,
        userId: socket.userId,
      });
    });

    socket.on('typing_stop', (payload) => {
      const conversationId = getConversationId(payload);
      if (!conversationId || !authorizedConversations.has(conversationId.toString())) return;
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

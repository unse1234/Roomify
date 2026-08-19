import mongoose from "mongoose";
import { Conversation, Message } from "../models/chat.model.js";
import { getIO } from "../socket/chat.socket.js";

// Only the two participants of a conversation may read or act on it.
const assertParticipant = (conversation, userId) => {
  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId.toString(),
  );
  if (!isParticipant) {
    const error = new Error("Not authorized to access this conversation");
    error.statusCode = 403;
    throw error;
  }
};

const rebuildConversationPreview = async (conversationId, session) => {
  const latestMessage = await Message.findOne({
    conversation: conversationId,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .session(session)
    .lean();

  const lastMessage = latestMessage
    ? {
        content: latestMessage.content,
        sender: latestMessage.sender,
        sentAt: latestMessage.createdAt,
      }
    : {
        content: "",
        sender: null,
        sentAt: null,
      };

  await Conversation.updateOne(
    { _id: conversationId },
    { $set: { lastMessage } },
    { session },
  );

  return latestMessage;
};

/**
 * POST /api/chat/conversations
 * Starts a conversation with a recipient (optionally scoped to a
 * property), or returns the existing one if it already exists.
 */
export const startConversation = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { recipientId, propertyId = null } = req.body;

    if (!recipientId) {
      return res
        .status(400)
        .json({ success: false, message: "recipientId is required" });
    }

    if (String(recipientId) === String(senderId)) {
      return res.status(400).json({
        success: false,
        message: "Cannot start a conversation with yourself",
      });
    }

    // Sorted so the same pair always maps to the same array value,
    // regardless of who initiates the conversation.
    const participants = [String(senderId), String(recipientId)].sort();

    const conversation = await Conversation.findOneAndUpdate(
      { participants, property: propertyId },
      { $setOnInsert: { participants, property: propertyId } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    )
      .populate("participants", "name avatar")
      .populate("property", "title images");

    return res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    // Two simultaneous requests can both attempt an insert; one loses
    // to the unique index. Treat that race as a success, not an error.
    if (error.code === 11000) {
      const senderId = req.user._id;
      const { recipientId, propertyId = null } = req.body;
      const participants = [String(senderId), String(recipientId)].sort();

      const existing = await Conversation.findOne({
        participants,
        property: propertyId,
      })
        .populate("participants", "name avatar")
        .populate("property", "title images");

      return res.status(200).json({ success: true, data: existing });
    }

    return res
      .status(500)
      .json({ success: false, message: "Failed to start conversation" });
  }
};

/**
 * GET /api/chat/conversations
 * Returns the current user's conversations, most recently active
 * first, with their personal unread count resolved to a plain number.
 */
export const getMyConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate("participants", "name avatar")
      .populate("property", "title images")
      .lean();

    const data = conversations.map(({ unreadCounts, ...conv }) => ({
      ...conv,
      unreadCount: unreadCounts?.[userId.toString()] || 0,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch conversations" });
  }
};

/**
 * GET /api/chat/conversations/:conversationId/messages
 * Cursor-paginated message history, newest first. Pass `before`
 * (an ISO timestamp) to fetch messages older than that point.
 */
export const getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const { before, limit = 20 } = req.query;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found" });
    }
    assertParticipant(conversation, userId);

    const query = { conversation: conversationId, isDeleted: false };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit), 50))
      .populate("sender", "name avatar");

    return res.status(200).json({ success: true, data: messages });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to fetch messages",
    });
  }
};

/**
 * POST /api/chat/conversations/:conversationId/messages
 * Creates a message and updates the conversation's lastMessage
 * preview + the recipient's unread count in one transaction, so the
 * two writes can't drift out of sync if something fails mid-way.
 */
export const sendMessage = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const senderId = req.user._id;
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Message content is required" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found" });
    }
    assertParticipant(conversation, senderId);

    const recipientId = conversation.participants.find(
      (p) => p.toString() !== senderId.toString(),
    );

    let message;
    await session.withTransaction(async () => {
      const created = await Message.create(
        [
          {
            conversation: conversationId,
            sender: senderId,
            content: content.trim(),
          },
        ],
        { session },
      );
      message = created[0];

      const currentUnread =
        conversation.unreadCounts.get(recipientId.toString()) || 0;
      conversation.unreadCounts.set(recipientId.toString(), currentUnread + 1);
      conversation.lastMessage = {
        content: message.content,
        sender: senderId,
        sentAt: message.createdAt,
      };
      await conversation.save({ session });
    });

    await message.populate("sender", "name avatar");

    // Push to the recipient's personal room and the conversation room —
    // covers both "inbox open" and "thread open" client states.
    getIO().to(`user:${recipientId}`).emit("new_message", message);
    getIO().to(`conversation:${conversationId}`).emit("new_message", message);

    return res.status(201).json({ success: true, data: message });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to send message",
    });
  } finally {
    session.endSession();
  }
};

/**
 * PATCH /api/chat/conversations/:conversationId/read
 * Marks the other participant's unread messages as read and resets
 * the current user's unread count for this conversation.
 */
export const markConversationAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found" });
    }
    assertParticipant(conversation, userId);

    await Message.updateMany(
      { conversation: conversationId, sender: { $ne: userId }, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );

    conversation.unreadCounts.set(userId.toString(), 0);
    await conversation.save();

    getIO().to(`conversation:${conversationId}`).emit("conversation_read", {
      conversationId,
      readBy: userId,
    });

    return res
      .status(200)
      .json({ success: true, message: "Conversation marked as read" });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to mark as read",
    });
  }
};

/**
 * DELETE /api/chat/messages/:messageId
 * Soft-deletes a message. Only the original sender can delete it.
 */
export const deleteMessage = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const userId = req.user._id;
    const { messageId } = req.params;
    let deletedMessage;
    let latestMessage;
    let participantIds;

    await session.withTransaction(async () => {
      const message = await Message.findById(messageId).session(session);
      if (!message) {
        const error = new Error("Message not found");
        error.statusCode = 404;
        throw error;
      }

      const conversation = await Conversation.findById(
        message.conversation,
      ).session(session);
      if (!conversation) {
        const error = new Error("Conversation not found");
        error.statusCode = 404;
        throw error;
      }
      assertParticipant(conversation, userId);
      participantIds = conversation.participants.map((participant) =>
        participant.toString(),
      );

      if (message.sender.toString() !== userId.toString()) {
        const error = new Error("Not authorized to delete this message");
        error.statusCode = 403;
        throw error;
      }

      if (message.isDeleted) {
        const error = new Error("Message has already been deleted");
        error.statusCode = 404;
        throw error;
      }

      message.isDeleted = true;
      await message.save({ session });
      deletedMessage = message;
      latestMessage = await rebuildConversationPreview(
        message.conversation,
        session,
      );
    });

    const conversationId = deletedMessage.conversation.toString();
    const deletionEvent = {
      messageId: deletedMessage._id,
      conversationId,
      lastMessage: latestMessage
        ? {
            content: latestMessage.content,
            sender: latestMessage.sender,
            sentAt: latestMessage.createdAt,
          }
        : { content: "", sender: null, sentAt: null },
    };
    participantIds.forEach((participantId) => {
      getIO()
        .to(`user:${participantId}`)
        .emit("message_deleted", deletionEvent);
    });
    getIO().to(`conversation:${conversationId}`).emit("message_deleted", {
      messageId: deletedMessage._id,
      conversationId,
    });

    return res.status(200).json({
      success: true,
      message: "Message deleted",
      conversationId,
      lastMessage: latestMessage,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to delete message",
    });
  } finally {
    await session.endSession();
  }
};

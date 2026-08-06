import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * ────────────────────────────────────────────────────────────────
 * SYSTEM DESIGN — Schema Separation (Conversation vs Message)
 * ────────────────────────────────────────────────────────────────
 * We keep Conversation and Message as two separate collections
 * instead of embedding messages inside a conversation document:
 *
 *   - MongoDB documents have a 16MB hard cap. An active chat
 *     thread would eventually blow past that if messages were
 *     embedded as an array on the conversation.
 *   - The inbox screen only needs conversation METADATA
 *     (participants, last message preview, unread count) —
 *     keeping messages in their own collection means that query
 *     stays cheap and doesn't degrade as message history grows.
 *   - Messages can be indexed, paginated, and archived
 *     independently of the conversation they belong to.
 * ────────────────────────────────────────────────────────────────
 */

const conversationSchema = new Schema(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
      validate: {
        validator: (arr) => arr.length === 2,
        message: 'A conversation must have exactly 2 participants',
      },
    },

    // Ties the conversation to the listing that started it
    // (e.g. a guest messaging a host from a property page).
    // Optional so general (non-property) chats are still possible.
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      default: null,
    },

    /**
     * SYSTEM DESIGN — Denormalization for read performance
     * We snapshot the last message directly onto the conversation
     * document (same pattern already used for Property.averageRating).
     * This lets the inbox/conversation-list screen render with a
     * SINGLE query — no need to populate + sort the Message
     * collection per conversation just to show a preview line.
     * Trade-off: this copy can drift if written carelessly, so it
     * must only ever be updated from inside createMessage (never
     * set directly from client input).
     */
    lastMessage: {
      content: { type: String, default: '' },
      sender: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      sentAt: { type: Date, default: null },
    },

    /**
     * SYSTEM DESIGN — Map for per-participant unread counts
     * A Map keyed by userId gives O(1) increment for the recipient
     * and O(1) reset for the reader when they open the thread —
     * no need to scan the Message collection to compute unread
     * state every time the inbox loads.
     */
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

/**
 * SYSTEM DESIGN — Compound unique index
 * Prevents duplicate conversations between the same two users
 * about the same property. Enforced at the DB level (not just in
 * the controller), so it stays correct even under concurrent
 * "start chat" requests — the same guarantee we already rely on
 * for booking double-booking prevention.
 */
conversationSchema.index({ participants: 1, property: 1 }, { unique: true });

// Fast "list my conversations, most recently active first" query,
// used directly by the inbox endpoint.
conversationSchema.index({ participants: 1, updatedAt: -1 });

const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // Kept minimal for MVP — extend to {url, type} objects only
    // if/when file attachments are actually needed. Avoids
    // building out storage/validation for a feature not yet used.
    attachments: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ['image', 'document'], required: true },
      },
    ],

    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },

    // Soft delete: keeps the record (for moderation/audit) instead
    // of a hard delete. Query layer filters isDeleted: false.
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/**
 * SYSTEM DESIGN — Cursor-friendly compound index
 * Chat history is paginated by (conversation, createdAt) instead
 * of skip/limit offset pagination. Offset pagination gets slower
 * the deeper a user scrolls back, because Mongo still has to walk
 * and discard every skipped document. With this index, the query
 *
 *   Message.find({ conversation: id, createdAt: { $lt: cursor } })
 *          .sort({ createdAt: -1 })
 *          .limit(20)
 *
 * is served directly off the index — no in-memory sort, and cost
 * stays flat no matter how far back the user pages.
 */
messageSchema.index({ conversation: 1, createdAt: -1 });

export const Conversation = model('Conversation', conversationSchema);
export const Message = model('Message', messageSchema);
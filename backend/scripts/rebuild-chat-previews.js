import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../src/config/database.js";
import { Conversation, Message } from "../src/models/chat.model.js";

dotenv.config();

const emptyPreview = {
  content: "",
  sender: null,
  sentAt: null,
};

const rebuildChatPreviews = async () => {
  await connectDB();

  // Clear stale previews first, then restore the newest visible message for each conversation.
  await Conversation.updateMany(
    {},
    { $set: { lastMessage: emptyPreview } },
    { timestamps: false },
  );

  const latestMessages = await Message.aggregate([
    { $match: { isDeleted: false } },
    { $sort: { conversation: 1, createdAt: -1, _id: -1 } },
    {
      $group: {
        _id: "$conversation",
        content: { $first: "$content" },
        sender: { $first: "$sender" },
        sentAt: { $first: "$createdAt" },
      },
    },
  ]);

  if (latestMessages.length > 0) {
    await Conversation.bulkWrite(
      latestMessages.map((message) => ({
        updateOne: {
          filter: { _id: message._id },
          update: {
            $set: {
              lastMessage: {
                content: message.content,
                sender: message.sender,
                sentAt: message.sentAt,
              },
            },
          },
        },
      })),
      { ordered: false, timestamps: false },
    );
  }

  console.log(`Rebuilt ${latestMessages.length} conversation previews.`);
};

try {
  await rebuildChatPreviews();
} finally {
  await mongoose.disconnect();
}

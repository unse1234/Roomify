import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  startConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  markConversationAsRead,
  deleteMessage,
} from "../controllers/chat.controller.js";
import {
  startConversationSchema,
  sendMessageSchema,
  getMessagesQuerySchema,
} from "../validations/chat.validation.js";

const router = Router();

// All chat routes require an authenticated user.
router.use(protect);

router.post(
  "/conversations",
  validate(startConversationSchema, "body"),
  startConversation,
);
router.get("/conversations", getMyConversations);

router.get(
  "/conversations/:conversationId/messages",
  validate(getMessagesQuerySchema, "query"),
  getMessages,
);
router.post(
  "/conversations/:conversationId/messages",
  validate(sendMessageSchema, "body"),
  sendMessage,
);

router.patch("/conversations/:conversationId/read", markConversationAsRead);
router.delete("/messages/:messageId", deleteMessage);

export default router;

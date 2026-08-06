import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

export const startConversationSchema = z.object({
  recipientId: objectId,
  propertyId: objectId.nullable().optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message cannot be empty').max(2000),
});

export const getMessagesQuerySchema = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
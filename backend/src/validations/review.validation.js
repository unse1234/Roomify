// validations/review.validation.js
import { z } from 'zod';
import mongoose from 'mongoose';

// ─── Reusable ─────────────────────────────────────────────────────────────────
const mongoId = z
  .string({ required_error: 'ID is required' })
  .refine((val) => mongoose.isValidObjectId(val), {
    message: 'Invalid ID format',
  });

const rating = z
  .number()
  .int('Rating must be a whole number')
  .min(1, 'Rating must be at least 1')
  .max(5, 'Rating cannot exceed 5');

const categoryRating = z
  .number()
  .int()
  .min(1)
  .max(5)
  .optional();

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const createReviewSchema = z.object({
  bookingId: mongoId,

  rating,

  // Optional per-category breakdown — Airbnb style
  categoryRatings: z
    .object({
      cleanliness:   categoryRating,
      communication: categoryRating,
      checkIn:       categoryRating,
      accuracy:      categoryRating,
      location:      categoryRating,
      value:         categoryRating,
    })
    .optional(),

  comment: z
    .string({ required_error: 'Review comment is required' })
    .min(10, 'Review must be at least 10 characters')
    .max(1000, 'Review cannot exceed 1000 characters')
    .trim(),
});

export const updateReviewSchema = z
  .object({
    rating:          rating.optional(),
    categoryRatings: z
      .object({
        cleanliness:   categoryRating,
        communication: categoryRating,
        checkIn:       categoryRating,
        accuracy:      categoryRating,
        location:      categoryRating,
        value:         categoryRating,
      })
      .optional(),
    comment: z
      .string()
      .min(10, 'Review must be at least 10 characters')
      .max(1000, 'Review cannot exceed 1000 characters')
      .trim()
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field is required to update' }
  );

export const hostResponseSchema = z.object({
  comment: z
    .string({ required_error: 'Response comment is required' })
    .min(10, 'Response must be at least 10 characters')
    .max(1000, 'Response cannot exceed 1000 characters')
    .trim(),
});

export const toggleVisibilitySchema = z.object({
  isVisible: z.boolean({ required_error: 'isVisible (boolean) is required' }),
});

export const reviewPaginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, { message: 'Page must be a positive number' }),

  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 50, {
      message: 'Limit must be between 1 and 50',
    }),

  sort: z
    .enum(['newest', 'oldest', 'highest', 'lowest'])
    .optional()
    .default('newest'),
});
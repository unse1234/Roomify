// models/review.model.js

import mongoose from 'mongoose';
import Property from './property.model.js';

const { Schema } = mongoose;

// ─── Sub-schema: Category Ratings ─────────────────────────────────────────────
// Airbnb-style breakdown — overall rating + individual category ratings
// Each category is optional but overall rating is required
const categoryRatingSchema = new Schema(
  {
    cleanliness:   { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
    checkIn:       { type: Number, min: 1, max: 5 },
    accuracy:      { type: Number, min: 1, max: 5 }, // listing matches reality?
    location:      { type: Number, min: 1, max: 5 },
    value:         { type: Number, min: 1, max: 5 }, // worth the price?
  },
  { _id: false }
);

// ─── Sub-schema: Host Response ─────────────────────────────────────────────────
// Host can publicly respond to a guest review — like Airbnb
const hostResponseSchema = new Schema(
  {
    comment:     { type: String, trim: true, maxlength: 1000 },
    respondedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ─── Main Schema ───────────────────────────────────────────────────────────────
const reviewSchema = new Schema(
  {
    // ── Core References ──────────────────────────────────────────────────────
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property reference is required'],
    },
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer reference is required'],
    },

    // Booking reference ensures:
    // 1. Review only possible after an actual stay
    // 2. One review per booking (enforced via unique index below)
    // 3. Prevents fake/unverified reviews
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
    },

    // ── Ratings ──────────────────────────────────────────────────────────────
    rating: {
      type: Number,
      required: [true, 'Overall rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },

    // Optional breakdown per category
    categoryRatings: { type: categoryRatingSchema, default: {} },

    // ── Review Content ────────────────────────────────────────────────────────
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      minlength: [10, 'Review must be at least 10 characters'],
      maxlength: [1000, 'Review cannot exceed 1000 characters'],
    },

    // ── Host Response ─────────────────────────────────────────────────────────
    // Host can respond to review publicly — optional
    hostResponse: { type: hostResponseSchema, default: null },

    // ── Moderation ────────────────────────────────────────────────────────────
    // Admin can flag/hide inappropriate reviews
    isVisible: { type: Boolean, default: true },

    // ── Review Type ───────────────────────────────────────────────────────────
    // Future-proofing: guest reviews property, host reviews guest
    type: {
      type: String,
      enum: ['guest_to_property', 'host_to_guest'],
      default: 'guest_to_property',
    },
  },
  {
    timestamps: true,
    toJSON:  { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────

// One review per booking — prevents duplicate reviews for same stay
// This is the most critical constraint
reviewSchema.index({ booking: 1 }, { unique: true });

// Fetch all reviews for a property efficiently
reviewSchema.index({ property: 1, isVisible: 1 });

// Fetch all reviews written by a user
reviewSchema.index({ reviewer: 1 });

// ─── Post Save Hook ────────────────────────────────────────────────────────────
// After every review save/delete — recalculate and update
// property's averageRating and totalReviews (denormalized fields)
// This keeps property listing data fresh without expensive aggregation on every fetch

const recalculatePropertyRating = async (propertyId) => {
  const result = await mongoose.model('Review').aggregate([
    {
      $match: {
        property:  new mongoose.Types.ObjectId(propertyId),
        isVisible: true,
        type:      'guest_to_property',
      },
    },
    {
      $group: {
        _id:           '$property',
        averageRating: { $avg: '$rating' },
        totalReviews:  { $sum: 1 },
      },
    },
  ]);

  const stats = result[0] || { averageRating: 0, totalReviews: 0 };

  await Property.findByIdAndUpdate(propertyId, {
    averageRating: Math.round(stats.averageRating * 10) / 10, // round to 1 decimal e.g. 4.7
    totalReviews:  stats.totalReviews,
  });
};

// Fires after new review is created or existing one is updated
reviewSchema.post('save', async function () {
  await recalculatePropertyRating(this.property);
});

// Fires after review is deleted via findByIdAndDelete / findOneAndDelete
reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) await recalculatePropertyRating(doc.property);
});

// Fires after review.deleteOne() is called on a document instance
reviewSchema.post('deleteOne', { document: true, query: false }, async function () {
  await recalculatePropertyRating(this.property);
});

export default mongoose.model('Review', reviewSchema);
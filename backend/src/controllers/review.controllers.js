// controllers/review.controllers.js
import mongoose from 'mongoose';
import Review, { recalculatePropertyRating } from '../models/review.model.js';
import Booking  from '../models/booking.model.js';
import Property from '../models/property.model.js';
import { BOOKING_STATUS } from '../config/booking.config.js';

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard populate config for review responses.
 * Centralized to avoid repetition and ensure consistency.
 */
const REVIEW_POPULATE = [
  { path: 'reviewer', select: 'name'       },
  { path: 'property', select: 'title host' },
];

/**
 * Sort map — translates query param to Mongoose sort object.
 * @param {string} sort
 * @returns {object}
 */
const SORT_MAP = {
  newest:  { createdAt: -1 },
  oldest:  { createdAt:  1 },
  highest: { rating: -1    },
  lowest:  { rating:  1    },
};

/**
 * Verifies the requesting user owns this review.
 * @param {object} review
 * @param {object} user
 * @returns {boolean}
 */
const isReviewOwner = (review, user) =>
  review.reviewer.toString() === user._id.toString();

/**
 * Verifies the requesting user is the host of the reviewed property.
 * @param {object} review  - populated with property.host
 * @param {object} user
 * @returns {boolean}
 */
const isPropertyHost = (review, user) =>
  review.property?.host?.toString() === user._id.toString();

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

// ─── @route   POST /api/reviews
// ─── @access  Private — guest
// ─── @note    Review is only allowed after a completed stay.
//              The booking's isReviewed flag is flipped atomically
//              within a transaction to prevent duplicate reviews
//              even under concurrent requests.
export const createReview = async (req, res) => {
  const { bookingId, rating, categoryRatings, comment } = req.body;

  // ── Validate booking ID format ─────────────────────────────────────────────
  if (!mongoose.isValidObjectId(bookingId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid booking ID format',
    });
  }

  // ── Fetch booking with property ref ───────────────────────────────────────
  const booking = await Booking.findById(bookingId).lean();

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
    });
  }

  // ── Only the guest of this booking can review ──────────────────────────────
  if (booking.guest.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Only the guest of this booking can leave a review',
    });
  }

  // ── Booking must be completed — stay must have happened ───────────────────
  if (booking.status !== BOOKING_STATUS.COMPLETED) {
    return res.status(400).json({
      success: false,
      message: `Reviews can only be submitted after a completed stay. Current booking status: "${booking.status}"`,
    });
  }

  // ── Prevent duplicate reviews ──────────────────────────────────────────────
  // DB-level unique index on booking handles the race condition,
  // but this check gives a cleaner error message before hitting the index.
  if (booking.isReviewed) {
    return res.status(409).json({
      success: false,
      message: 'You have already submitted a review for this booking',
    });
  }

  // ── Atomic review creation + booking flag update ───────────────────────────
  // Transaction ensures both operations succeed or both fail.
  // Without this, a crash between create and flag-update could allow
  // a second review attempt to pass the isReviewed check.
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Create review inside transaction
    const [review] = await Review.create(
      [
        {
          property:        booking.property,
          reviewer:        req.user._id,
          booking:         bookingId,
          rating,
          categoryRatings: categoryRatings ?? {},
          comment,
          type:            'guest_to_property',
        },
      ],
      { session }
    );

    // Flip isReviewed flag on booking — prevents duplicate review attempts
    await Booking.findByIdAndUpdate(
      bookingId,
      { $set: { isReviewed: true } },
      { session }
    );

    await session.commitTransaction();

    // Populate after commit — no need to hold transaction open
    await review.populate(REVIEW_POPULATE);

    return res.status(201).json({ success: true, data: review });
  } catch (err) {
    await session.abortTransaction();

    // Mongoose duplicate key error — unique index on booking was hit
    // (race condition where two requests slipped through the isReviewed check)
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A review for this booking already exists',
      });
    }

    throw err; // Express 5 forwards to global error handler
  } finally {
    session.endSession();
  }
};

// ─── @route   GET /api/reviews/property/:propertyId
// ─── @access  Public
export const getPropertyReviews = async (req, res) => {
  const { propertyId } = req.params;

  if (!mongoose.isValidObjectId(propertyId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid property ID format',
    });
  }

  // Verify property exists
  const propertyExists = await Property.exists({ _id: propertyId });
  if (!propertyExists) {
    return res.status(404).json({
      success: false,
      message: 'Property not found',
    });
  }

  const { page, limit, sort } = req.query;
  const skip = (page - 1) * limit;

  const filter = {
    property:  propertyId,
    isVisible: true,
    type:      'guest_to_property',
  };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('reviewer', 'name')
      .sort(SORT_MAP[sort] ?? SORT_MAP.newest)
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);

  // Fetch denormalized stats from property — avoids re-aggregating
  const property = await Property.findById(propertyId)
    .select('averageRating totalReviews')
    .lean();

  return res.status(200).json({
    success:       true,
    averageRating: property?.averageRating ?? 0,
    totalReviews:  property?.totalReviews  ?? 0,
    total,
    page,
    totalPages:    Math.ceil(total / limit),
    count:         reviews.length,
    data:          reviews,
  });
};

// ─── @route   GET /api/reviews/my-reviews
// ─── @access  Private — guest
export const getMyReviews = async (req, res) => {
  const { page, limit, sort } = req.query;
  const skip = (page - 1) * limit;

  const filter = { reviewer: req.user._id };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('property', 'title address images')
      .sort(SORT_MAP[sort] ?? SORT_MAP.newest)
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);

  return res.status(200).json({
    success:    true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    count:      reviews.length,
    data:       reviews,
  });
};

// ─── @route   GET /api/reviews/:id
// ─── @access  Public
export const getReviewById = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid review ID format',
    });
  }

  const review = await Review.findById(req.params.id)
    .populate(REVIEW_POPULATE)
    .lean();

  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  // Hidden reviews only visible to admins
  if (!review.isVisible && !req.user?.hasRole('admin')) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  return res.status(200).json({ success: true, data: review });
};

// ─── @route   PATCH /api/reviews/:id
// ─── @access  Private — review owner only
// ─── @note    Only rating, categoryRatings, and comment are updatable.
//              Changing these fields triggers the post-save hook which
//              recalculates the property's averageRating automatically.
export const updateReview = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid review ID format',
    });
  }

  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  if (!isReviewOwner(review, req.user)) {
    return res.status(403).json({
      success: false,
      message: 'You can only edit your own reviews',
    });
  }

  // Only these fields are mutable by the reviewer
  const allowedUpdates = ['rating', 'categoryRatings', 'comment'];
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) review[field] = req.body[field];
  });

  // .save() triggers post-save hook → recalculates property averageRating
  await review.save();
  await review.populate(REVIEW_POPULATE);

  return res.status(200).json({ success: true, data: review });
};

// ─── @route   DELETE /api/reviews/:id
// ─── @access  Private — review owner or admin
// ─── @note    Uses deleteOne() on the document instance to trigger the
//              post-deleteOne hook, which recalculates property rating.
//              findByIdAndDelete() triggers post-findOneAndDelete hook instead —
//              both hooks are registered on the schema.
export const deleteReview = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid review ID format',
    });
  }

  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  if (!isReviewOwner(review, req.user) && !req.user.hasRole('admin')) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this review',
    });
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await Booking.findByIdAndUpdate(
        review.booking,
        { $set: { isReviewed: false } },
        { session },
      );

      await Review.deleteOne({ _id: review._id }, { session });
    });
  } finally {
    await session.endSession();
  }

  // Recalculate after commit so the aggregation sees the deleted review.
  await recalculatePropertyRating(review.property);

  return res.status(200).json({
    success: true,
    message: 'Review deleted successfully',
  });
};

// ─── @route   PATCH /api/reviews/:id/host-response
// ─── @access  Private — property host only
// ─── @note    Host can respond to a guest review publicly.
//              Only one response per review — subsequent calls overwrite it.
export const addHostResponse = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid review ID format',
    });
  }

  const review = await Review.findById(req.params.id).populate('property', 'host title');

  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  // Only the host of the reviewed property can respond
  if (!isPropertyHost(review, req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Only the property host can respond to this review',
    });
  }

  // Overwrite existing response if present (host can update their response)
  review.hostResponse = {
    comment:     req.body.comment,
    respondedAt: new Date(),
  };

  await review.save();

  return res.status(200).json({ success: true, data: review });
};

// ─── @route   PATCH /api/reviews/:id/visibility
// ─── @access  Private — admin only
// ─── @note    Soft hide/unhide — review is never hard deleted by admin.
//              Hidden reviews are excluded from public listing but preserved
//              for audit purposes. Rating recalculation only counts visible reviews.
export const toggleVisibility = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid review ID format',
    });
  }

  const { isVisible } = req.body;

  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found' });
  }

  // No-op check — avoid unnecessary save + hook trigger
  if (review.isVisible === isVisible) {
    return res.status(200).json({
      success: true,
      message: `Review is already ${isVisible ? 'visible' : 'hidden'}`,
      data:    review,
    });
  }

  review.isVisible = isVisible;

  // .save() triggers post-save hook → recalculates property rating
  // Hidden reviews are excluded from the aggregation in the hook
  await review.save();

  return res.status(200).json({
    success: true,
    message: `Review ${isVisible ? 'made visible' : 'hidden'} successfully`,
    data:    review,
  });
};
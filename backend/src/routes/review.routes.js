// routes/review.routes.js
import express   from 'express';
import {
  createReview, getPropertyReviews, getMyReviews,
  getReviewById, updateReview, deleteReview,
  addHostResponse, toggleVisibility,
} from '../controllers/review.controllers.js';
import protect   from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createReviewSchema, updateReviewSchema,
  hostResponseSchema, toggleVisibilitySchema,
  reviewPaginationSchema,
} from '../validations/review.validation.js';

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get(
  '/property/:propertyId',
  validate(reviewPaginationSchema, 'query'),
  getPropertyReviews
);



// ── Guest ─────────────────────────────────────────────────────────────────────
router.post(
  '/',
  protect,
  authorize('guest'),
  validate(createReviewSchema),
  createReview
);

router.get(
  '/my-reviews',
  protect,
  authorize('guest'),
  validate(reviewPaginationSchema, 'query'),
  getMyReviews
);
router.get('/:id', getReviewById);
router.patch(
  '/:id',
  protect,
  authorize('guest'),
  validate(updateReviewSchema),
  updateReview
);

router.delete(
  '/:id',
  protect,
  deleteReview // owner or admin — checked inside controller
);

// ── Host ──────────────────────────────────────────────────────────────────────
router.patch(
  '/:id/host-response',
  protect,
  authorize('host'),
  validate(hostResponseSchema),
  addHostResponse
);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.patch(
  '/:id/visibility',
  protect,
  authorize('admin'),
  validate(toggleVisibilitySchema),
  toggleVisibility
);

export default router;
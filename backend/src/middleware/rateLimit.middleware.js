import rateLimit from "express-rate-limit";
import { rateLimited } from "../errors/AppError.js";
import { config } from "../config/config.js";

/**
 * Tiered rate limiting. All limiters key on the client IP (which is only
 * trustworthy once `trust proxy` is set correctly — see config.TRUST_PROXY)
 * and forward a 429 through the normal error pipeline so the response uses
 * the standard envelope and the RATE_LIMITED code the frontend already
 * knows how to render.
 */

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const rejectOverLimit = (req, res, next) => next(rateLimited());

const base = {
  windowMs: FIFTEEN_MINUTES,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rejectOverLimit,
  // In development there is no proxy; skip the header-vs-trust-proxy check
  // that would otherwise log a warning on every request.
  validate: config.isProduction ? undefined : { trustProxy: false, xForwardedForHeader: false },
};

/** Generous ceiling applied to every request as a coarse abuse backstop. */
export const apiLimiter = rateLimit({ ...base, limit: 600 });

/** Moderate ceiling for state-changing requests (skips safe reads). */
export const writeLimiter = rateLimit({
  ...base,
  limit: 120,
  skip: (req) => ["GET", "HEAD", "OPTIONS"].includes(req.method),
});

/**
 * Strict ceiling for credential endpoints. Successful requests do not count,
 * so a legitimate user is never locked out — only repeated failures burn the
 * budget.
 */
export const authLimiter = rateLimit({
  ...base,
  limit: 12,
  skipSuccessfulRequests: true,
});

/** Registration: cap creation attempts regardless of outcome. */
export const registerLimiter = rateLimit({ ...base, limit: 10 });

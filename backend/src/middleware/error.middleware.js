import { ERROR_CODES } from "../errors/errorCodes.js";
import { notFound } from "../errors/AppError.js";
import { normalizeError, toErrorResponse } from "../errors/normalizeError.js";
import { logger } from "../utils/logger.js";

export const notFoundHandler = (req, res, next) => {
  next(notFound("The requested endpoint could not be found.", ERROR_CODES.NOT_FOUND));
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const normalized = normalizeError(err, res.statusCode >= 400 ? res.statusCode : 500);
  const { statusCode, body } = toErrorResponse(normalized, req.requestId);

  logger[statusCode >= 500 ? "error" : "warn"]("request_error", {
    requestId: req.requestId,
    method: req.method,
    route: req.route?.path || req.path,
    statusCode,
    errorCode: body.error.code,
    errorMessage: normalized.message,
    ...(statusCode >= 500 ? { stack: normalized.cause?.stack || normalized.stack } : {}),
    userId: req.user?._id?.toString(),
  });

  return res.status(statusCode).json(body);
};

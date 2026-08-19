import { normalizeRequestId } from "../utils/requestId.js";
import { logger } from "../utils/logger.js";

export const requestContext = (req, res, next) => {
  req.requestId = normalizeRequestId(req.headers["x-request-id"]);
  req.startedAt = process.hrtime.bigint();
  res.setHeader("X-Request-ID", req.requestId);
  next();
};

export const requestLogger = (req, res, next) => {
  res.on("finish", () => {
    if (req.path === "/health") return;

    const durationMs = Number(process.hrtime.bigint() - req.startedAt) / 1_000_000;
    const meta = {
      requestId: req.requestId,
      method: req.method,
      route: req.route?.path || req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs),
      userId: req.user?._id?.toString(),
    };

    if (res.statusCode >= 500) return logger.error("http_request", meta);
    if (res.statusCode >= 400) return logger.warn("http_request", meta);
    logger.info("http_request", meta);
  });

  next();
};

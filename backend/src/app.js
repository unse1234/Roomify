import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import authRoutes from "./routes/auth.routes.js";
import propertyRoutes from "./routes/property.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import { config } from "./config/config.js";
import { apiLimiter, writeLimiter } from "./middleware/rateLimit.middleware.js";
import { requestContext, requestLogger } from "./middleware/requestContext.middleware.js";
import { normalizeErrorResponses } from "./middleware/errorResponse.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";

const app = express();

// Must be first: rate limiting and access logs read req.ip, which is the
// proxy's address unless Express is told how many proxies sit in front.
app.set("trust proxy", config.TRUST_PROXY);
app.disable("x-powered-by");

// Security headers. The API serves JSON only, so the policy can be strict.
// CORP is relaxed to cross-origin because the SPA is served from a
// different origin and needs to read these responses.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(requestContext);

const allowedOrigins = config.corsOrigins;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    exposedHeaders: ["X-Request-ID"],
  }),
);

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(compression());
app.use(normalizeErrorResponses);
app.use(requestLogger);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Roomify API is running",
  });
});

// Coarse global ceiling, then a stricter ceiling on writes. Auth routes add
// their own stricter limiter on top.
app.use(apiLimiter);
app.use(writeLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/chat", chatRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

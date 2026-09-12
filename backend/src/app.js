import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import authRoutes from "./routes/auth.routes.js";
import propertyRoutes from "./routes/property.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import configRoutes from "./routes/config.routes.js";
import { config } from "./config/config.js";
import { apiLimiter, writeLimiter } from "./middleware/rateLimit.middleware.js";
import { requestContext, requestLogger } from "./middleware/requestContext.middleware.js";
import { normalizeErrorResponses } from "./middleware/errorResponse.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import {
  PERF_ENABLED,
  perfRequestCounter,
  perfSnapshot,
  measureMongoPing,
  collectCpuProfile,
} from "./utils/perf.js";

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

// Diagnostics only. PERF_DIAGNOSTICS defaults to false, so this adds
// nothing to the production request path unless explicitly switched on.
if (PERF_ENABLED) app.use(perfRequestCounter);

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

// Liveness: is the process up. Never touches dependencies.
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Roomify API is running",
  });
});

// Readiness: can the process actually serve traffic. Gate deploy traffic
// on this, not /health, so an instance with an unusable database is not
// sent requests.
app.get("/ready", (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({
    success: dbReady,
    checks: { database: dbReady ? "ok" : "unavailable" },
  });
});

// Profiling snapshot: event-loop delay, CPU used, cgroup CPU quota and
// throttling counters, Mongo pool saturation. Mounted only while
// PERF_DIAGNOSTICS is on so it can never leak in normal operation.
if (PERF_ENABLED) {
  // These endpoints describe the process, not the business data, but a
  // deployment is usually publicly reachable — so gate them on a shared
  // secret when one is configured, and make the profiler unavailable
  // without it (collecting a profile is itself a load).
  const authorizeDiagnostics = (req, res) => {
    const expected = config.PERF_DIAGNOSTICS_TOKEN;
    if (!expected) return true;
    if (req.query.token === expected) return true;
    res.status(404).json({ message: "Not found" });
    return false;
  };

  app.get("/__perf", async (req, res) => {
    if (!authorizeDiagnostics(req, res)) return;
    const snapshot = perfSnapshot(mongoose);
    if (req.query.ping === "1") {
      snapshot.mongoPing = await measureMongoPing(mongoose);
    }
    res.status(200).json(snapshot);
  });

  app.get("/__perf/profile", async (req, res) => {
    if (!authorizeDiagnostics(req, res)) return;
    const seconds = Math.min(Number(req.query.seconds) || 15, 60);
    try {
      const profile = await collectCpuProfile(seconds);
      res.status(200).json(profile);
    } catch (error) {
      res.status(409).json({ message: error.message });
    }
  });
}

// Coarse global ceiling, then a stricter ceiling on writes. Auth routes add
// their own stricter limiter on top.
app.use(apiLimiter);
app.use(writeLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/config", configRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

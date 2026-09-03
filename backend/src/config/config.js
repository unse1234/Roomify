import { z } from "zod";

/**
 * Single source of truth for backend configuration.
 *
 * Every environment variable the server consumes is declared here and parsed
 * once, at first import, against a schema. If anything required is missing or
 * malformed the process exits immediately with a list of every problem —
 * a boot-time failure instead of a runtime 500 on the first sign-in.
 *
 * server.js calls dotenv.config() before importing anything, so process.env
 * is already populated by the time this module is evaluated.
 */

const required = (name) =>
  z
    .string({ error: `${name} is required` })
    .trim()
    .min(1, `${name} must not be empty`);

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().max(65535).default(3000),

    MONGO_URI: required("MONGO_URI"),

    JWT_SECRET: z
      .string({ error: "JWT_SECRET is required" })
      .min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN: z.string().trim().min(1).default("7d"),

    // One canonical name for the web origin. CLIENT_URL is accepted as a
    // fallback so existing deployments keep working, but FRONTEND_URL wins.
    FRONTEND_URL: z.string().url().optional(),
    CLIENT_URL: z.string().url().optional(),

    IMAGEKIT_PUBLIC_KEY: required("IMAGEKIT_PUBLIC_KEY"),
    IMAGEKIT_PRIVATE_KEY: required("IMAGEKIT_PRIVATE_KEY"),
    IMAGEKIT_URL_ENDPOINT: required("IMAGEKIT_URL_ENDPOINT").pipe(z.string().url()),

    // Cookie behaviour. Cross-site (SameSite=None) is the current default so
    // no session breaks on upgrade; a same-site deployment should set this to
    // "lax" to regain the browser's built-in CSRF protection.
    COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("none"),

    // Express "trust proxy" setting. Empty/"false" => no proxy trusted;
    // "true" => trust all; a number => that many proxy hops; otherwise the
    // literal value (e.g. "loopback"). Must match the deployment topology or
    // per-IP rate limiting buckets every client behind the load balancer.
    TRUST_PROXY: z.string().trim().default(""),
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map(
    (issue) => `  - ${issue.path.join(".") || "config"}: ${issue.message}`,
  );
  // eslint-disable-next-line no-console
  console.error(
    `\nInvalid backend configuration — fix your environment (.env):\n${lines.join("\n")}\n`,
  );
  process.exit(1);
}

const env = parsed.data;
const explicitWebOrigin = env.FRONTEND_URL || env.CLIENT_URL;
const webOrigin = explicitWebOrigin || "http://localhost:5173";

if (env.NODE_ENV === "production" && !explicitWebOrigin) {
  // eslint-disable-next-line no-console
  console.warn(
    "[config] NODE_ENV=production but FRONTEND_URL is not set — CORS is " +
      `restricted to ${webOrigin}, which is almost certainly wrong for a deployed site.`,
  );
}

/**
 * Origins allowed to make credentialed requests, shared by the Express CORS
 * middleware and the Socket.io CORS config so the two can never disagree.
 */
const corsOrigins = Array.from(new Set([webOrigin, "http://localhost:5173"]));

const parseTrustProxy = (raw) => {
  const value = (raw || "").toLowerCase();
  if (value === "" || value === "false" || value === "0") return false;
  if (value === "true") return true;
  if (/^\d+$/.test(value)) return Number(value);
  return raw;
};

export const config = Object.freeze({
  NODE_ENV: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  PORT: env.PORT,

  MONGODB_URI: env.MONGO_URI,

  JWT_SECRET: env.JWT_SECRET,
  JWT_EXPIRES_IN: env.JWT_EXPIRES_IN,

  WEB_ORIGIN: webOrigin,
  corsOrigins,

  COOKIE_SAMESITE: env.COOKIE_SAMESITE,
  TRUST_PROXY: parseTrustProxy(env.TRUST_PROXY),

  IMAGEKIT: {
    publicKey: env.IMAGEKIT_PUBLIC_KEY,
    privateKey: env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
  },
});

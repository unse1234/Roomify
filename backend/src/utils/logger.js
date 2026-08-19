const redactKeys = new Set([
  "password",
  "token",
  "authorization",
  "cookie",
  "jwt",
  "secret",
  "apiKey",
  "privateKey",
]);

const redact = (value) => {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);

  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      redactKeys.has(key) || redactKeys.has(key.toLowerCase()) ? "[REDACTED]" : redact(nested),
    ]),
  );
};

const write = (level, event, meta = {}) => {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    event,
    environment: process.env.NODE_ENV || "development",
    ...redact(meta),
  };

  const line = JSON.stringify(log);
  if (level === "error" || level === "fatal") return console.error(line);
  if (level === "warn") return console.warn(line);
  return console.log(line);
};

export const logger = {
  debug: (event, meta) => {
    if (process.env.NODE_ENV !== "production") write("debug", event, meta);
  },
  info: (event, meta) => write("info", event, meta),
  warn: (event, meta) => write("warn", event, meta),
  error: (event, meta) => write("error", event, meta),
  fatal: (event, meta) => write("fatal", event, meta),
};

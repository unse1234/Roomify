import { validationError } from "../errors/AppError.js";

/**
 * Parse `req[source]` with a zod schema. On success the parsed value —
 * with every coercion, transform and DEFAULT applied — REPLACES the raw
 * source, so controllers that read `req.query` / `req.body` / `req.params`
 * can only ever see validated data. It is also exposed on
 * `req.validated[source]` for handlers that prefer to be explicit.
 *
 * Replacing the source matters most for pagination: the schemas supply
 * `page`/`limit` defaults and a server-enforced maximum. Before this,
 * controllers read the raw query, so omitting the params yielded
 * `undefined` and every bound was silently lost (F-03).
 *
 * Express 5 makes `req.query` a getter, so it is redefined rather than
 * assigned.
 */
export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const fieldErrors = result.error.issues.reduce((acc, issue) => {
        const field = issue.path.join(".") || "form";
        acc[field] = issue.message;
        return acc;
      }, {});

      return next(validationError(fieldErrors));
    }

    req.validated = req.validated || {};
    req.validated[source] = result.data;

    try {
      Object.defineProperty(req, source, {
        value: result.data,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    } catch {
      // Extremely unlikely; req.validated[source] is still authoritative.
    }

    next();
  };
};

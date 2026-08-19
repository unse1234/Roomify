import { AppError } from "../errors/AppError.js";
import { getDefaultCodeForStatus } from "../errors/errorCodes.js";
import { toErrorResponse } from "../errors/normalizeError.js";

const fieldErrorsFromLegacyArray = (errors = []) =>
  errors.reduce((acc, item) => {
    if (item?.field) acc[item.field] = item.message || "Invalid value.";
    return acc;
  }, {});

export const normalizeErrorResponses = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (
      res.statusCode >= 400 &&
      !(body?.success === false && body?.error?.code && body?.error?.requestId)
    ) {
      const details =
        body?.details ||
        (Array.isArray(body?.errors) ? fieldErrorsFromLegacyArray(body.errors) : null) ||
        (body?.conflict ? { conflict: body.conflict } : null);

      const appError = new AppError({
        code: body?.code || getDefaultCodeForStatus(res.statusCode),
        message: body?.message,
        statusCode: res.statusCode,
        details,
        expose: res.statusCode < 500,
      });

      const { body: normalizedBody } = toErrorResponse(appError, req.requestId);
      return originalJson(normalizedBody);
    }

    return originalJson(body);
  };

  next();
};

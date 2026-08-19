import mongoose from "mongoose";
import multer from "multer";
import { AppError } from "./AppError.js";
import {
  ERROR_CODES,
  getDefaultClientMessage,
  getDefaultCodeForStatus,
} from "./errorCodes.js";

const isProduction = () => process.env.NODE_ENV === "production";

const fieldMapFromZodIssues = (issues = []) =>
  issues.reduce((acc, issue) => {
    const field = issue.path?.join(".") || "form";
    acc[field] = issue.message;
    return acc;
  }, {});

const fieldMapFromMongooseValidation = (errors = {}) =>
  Object.entries(errors).reduce((acc, [field, value]) => {
    acc[field] = value?.message || "Invalid value.";
    return acc;
  }, {});

const getDuplicateKeyDetails = (keyValue = {}) =>
  Object.keys(keyValue).reduce((acc, field) => {
    acc[field] = `${field} already exists.`;
    return acc;
  }, {});

export const normalizeError = (err, fallbackStatusCode = 500) => {
  if (err instanceof AppError) {
    return err;
  }

  if (err?.name === "ZodError") {
    return new AppError({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: getDefaultClientMessage(ERROR_CODES.VALIDATION_ERROR),
      statusCode: 422,
      details: fieldMapFromZodIssues(err.issues),
      cause: err,
    });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return new AppError({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: getDefaultClientMessage(ERROR_CODES.VALIDATION_ERROR),
      statusCode: 422,
      details: fieldMapFromMongooseValidation(err.errors),
      cause: err,
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return new AppError({
      code: ERROR_CODES.BAD_REQUEST,
      message: "Invalid identifier provided.",
      statusCode: 400,
      details: { [err.path || "id"]: "Invalid identifier provided." },
      cause: err,
    });
  }

  if (err?.code === 11000) {
    return new AppError({
      code: ERROR_CODES.CONFLICT,
      message: getDefaultClientMessage(ERROR_CODES.CONFLICT),
      statusCode: 409,
      details: getDuplicateKeyDetails(err.keyValue),
      cause: err,
    });
  }

  if (
    err?.name === "MongooseServerSelectionError" ||
    err?.name === "MongoNetworkError" ||
    err?.name === "MongoTimeoutError"
  ) {
    return new AppError({
      code: ERROR_CODES.DATABASE_ERROR,
      message: getDefaultClientMessage(ERROR_CODES.DATABASE_ERROR),
      statusCode: 503,
      expose: false,
      cause: err,
    });
  }

  if (err instanceof multer.MulterError) {
    return new AppError({
      code: ERROR_CODES.VALIDATION_ERROR,
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "Uploaded files must be 5MB or smaller."
          : "The uploaded file could not be processed.",
      statusCode: 422,
      details: { images: err.message },
      cause: err,
    });
  }

  if (err?.message === "Not allowed by CORS") {
    return new AppError({
      code: ERROR_CODES.AUTHORIZATION_ERROR,
      message: "This origin is not allowed to access Roomify.",
      statusCode: 403,
      cause: err,
    });
  }

  if (err instanceof SyntaxError && err.status === 400) {
    return new AppError({
      code: ERROR_CODES.BAD_REQUEST,
      message: "The request body is not valid JSON.",
      statusCode: 400,
      cause: err,
    });
  }

  const statusCode = err?.statusCode || err?.status || fallbackStatusCode || 500;
  const code = err?.code && typeof err.code === "string" ? err.code : getDefaultCodeForStatus(statusCode);
  const expose = err?.expose ?? statusCode < 500;

  return new AppError({
    code,
    message: expose && err?.message ? err.message : getDefaultClientMessage(code),
    statusCode,
    details: err?.details || null,
    expose,
    cause: err,
  });
};

export const toErrorResponse = (error, requestId) => {
  const normalized = normalizeError(error);
  const code = isProduction() && normalized.statusCode >= 500
    ? ERROR_CODES.INTERNAL_SERVER_ERROR
    : normalized.code;
  const message = normalized.expose || !isProduction()
    ? normalized.message
    : getDefaultClientMessage(code);

  return {
    statusCode: normalized.statusCode,
    body: {
      success: false,
      error: {
        code,
        message,
        details: normalized.details,
        requestId,
        ...(!isProduction() && normalized.cause?.name
          ? { cause: normalized.cause.name }
          : {}),
      },
    },
    normalized,
  };
};

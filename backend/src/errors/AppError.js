import { ERROR_CODES, getDefaultClientMessage } from "./errorCodes.js";

export class AppError extends Error {
  constructor({
    code = ERROR_CODES.INTERNAL_SERVER_ERROR,
    message = getDefaultClientMessage(code),
    statusCode = 500,
    details = null,
    expose = statusCode < 500,
    cause,
  } = {}) {
    super(message, { cause });
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.expose = expose;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const badRequest = (message, details = null, code = ERROR_CODES.BAD_REQUEST) =>
  new AppError({ code, message, statusCode: 400, details });

export const unauthenticated = (
  message = getDefaultClientMessage(ERROR_CODES.AUTH_UNAUTHORIZED),
  code = ERROR_CODES.AUTH_UNAUTHORIZED,
) => new AppError({ code, message, statusCode: 401 });

export const forbidden = (
  message = getDefaultClientMessage(ERROR_CODES.AUTH_FORBIDDEN),
  code = ERROR_CODES.AUTH_FORBIDDEN,
) => new AppError({ code, message, statusCode: 403 });

export const notFound = (message, code = ERROR_CODES.NOT_FOUND) =>
  new AppError({ code, message, statusCode: 404 });

export const conflict = (message, details = null, code = ERROR_CODES.CONFLICT) =>
  new AppError({ code, message, statusCode: 409, details });

export const validationError = (details, message = getDefaultClientMessage(ERROR_CODES.VALIDATION_ERROR)) =>
  new AppError({
    code: ERROR_CODES.VALIDATION_ERROR,
    message,
    statusCode: 422,
    details,
  });

export const externalServiceError = (
  message = getDefaultClientMessage(ERROR_CODES.EXTERNAL_SERVICE_ERROR),
  cause,
) =>
  new AppError({
    code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
    message,
    statusCode: 503,
    expose: false,
    cause,
  });

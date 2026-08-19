export const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  BAD_REQUEST: "BAD_REQUEST",
  RATE_LIMITED: "RATE_LIMITED",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",

  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_SESSION_EXPIRED: "AUTH_SESSION_EXPIRED",
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  AUTH_FORBIDDEN: "AUTH_FORBIDDEN",

  PROPERTY_NOT_FOUND: "PROPERTY_NOT_FOUND",
  PROPERTY_ALREADY_EXISTS: "PROPERTY_ALREADY_EXISTS",
  BOOKING_NOT_FOUND: "BOOKING_NOT_FOUND",
  BOOKING_CONFLICT: "BOOKING_CONFLICT",
  REVIEW_NOT_FOUND: "REVIEW_NOT_FOUND",
  REVIEW_ALREADY_EXISTS: "REVIEW_ALREADY_EXISTS",
  CHAT_CONVERSATION_NOT_FOUND: "CHAT_CONVERSATION_NOT_FOUND",
  CHAT_MESSAGE_NOT_FOUND: "CHAT_MESSAGE_NOT_FOUND",
});

export const STATUS_CODE_MAP = Object.freeze({
  400: ERROR_CODES.BAD_REQUEST,
  401: ERROR_CODES.AUTHENTICATION_ERROR,
  403: ERROR_CODES.AUTHORIZATION_ERROR,
  404: ERROR_CODES.NOT_FOUND,
  409: ERROR_CODES.CONFLICT,
  422: ERROR_CODES.VALIDATION_ERROR,
  429: ERROR_CODES.RATE_LIMITED,
  500: ERROR_CODES.INTERNAL_SERVER_ERROR,
  502: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
  503: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
  504: ERROR_CODES.TIMEOUT,
});

export const DEFAULT_CLIENT_MESSAGES = Object.freeze({
  [ERROR_CODES.VALIDATION_ERROR]: "Please correct the highlighted fields.",
  [ERROR_CODES.AUTHENTICATION_ERROR]: "Please sign in to continue.",
  [ERROR_CODES.AUTHORIZATION_ERROR]: "You do not have permission to perform this action.",
  [ERROR_CODES.NOT_FOUND]: "The requested resource could not be found.",
  [ERROR_CODES.CONFLICT]: "This action conflicts with the current state. Please refresh and try again.",
  [ERROR_CODES.BAD_REQUEST]: "Please check your request and try again.",
  [ERROR_CODES.RATE_LIMITED]: "Too many requests. Please wait a moment and try again.",
  [ERROR_CODES.DATABASE_ERROR]: "We are having trouble reaching the service. Please try again in a moment.",
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: "A dependency is temporarily unavailable. Please try again in a moment.",
  [ERROR_CODES.NETWORK_ERROR]: "The connection was interrupted. Please try again.",
  [ERROR_CODES.TIMEOUT]: "The request is taking too long. Please try again.",
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: "Something went wrong. Please try again.",
  [ERROR_CODES.UNKNOWN_ERROR]: "Something went wrong. Please try again.",
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: "Invalid email or password.",
  [ERROR_CODES.AUTH_SESSION_EXPIRED]: "Your session has expired. Please sign in again.",
  [ERROR_CODES.AUTH_UNAUTHORIZED]: "Please sign in to continue.",
  [ERROR_CODES.AUTH_FORBIDDEN]: "You do not have permission to perform this action.",
  [ERROR_CODES.PROPERTY_NOT_FOUND]: "This property is no longer available.",
  [ERROR_CODES.BOOKING_NOT_FOUND]: "This booking could not be found.",
  [ERROR_CODES.BOOKING_CONFLICT]: "These dates are no longer available.",
  [ERROR_CODES.REVIEW_NOT_FOUND]: "This review could not be found.",
  [ERROR_CODES.REVIEW_ALREADY_EXISTS]: "A review for this booking already exists.",
  [ERROR_CODES.CHAT_CONVERSATION_NOT_FOUND]: "This conversation could not be found.",
  [ERROR_CODES.CHAT_MESSAGE_NOT_FOUND]: "This message could not be found.",
});

export const getDefaultCodeForStatus = (statusCode) =>
  STATUS_CODE_MAP[statusCode] || ERROR_CODES.INTERNAL_SERVER_ERROR;

export const getDefaultClientMessage = (code) =>
  DEFAULT_CLIENT_MESSAGES[code] || DEFAULT_CLIENT_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];

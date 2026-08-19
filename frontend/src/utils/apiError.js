export const API_ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  BAD_REQUEST: 'BAD_REQUEST',
  RATE_LIMITED: 'RATE_LIMITED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CANCELED: 'CANCELED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
});

const defaultMessage = 'Something went wrong. Please try again.';

const messagesByCode = {
  [API_ERROR_CODES.VALIDATION_ERROR]: 'Please correct the highlighted fields.',
  [API_ERROR_CODES.AUTHENTICATION_ERROR]: 'Please sign in to continue.',
  [API_ERROR_CODES.AUTHORIZATION_ERROR]: "You don't have permission to perform this action.",
  [API_ERROR_CODES.NOT_FOUND]: 'The requested item could not be found.',
  [API_ERROR_CODES.CONFLICT]: 'This action conflicts with the latest data. Please refresh and try again.',
  [API_ERROR_CODES.BAD_REQUEST]: 'Please check the information and try again.',
  [API_ERROR_CODES.RATE_LIMITED]: 'Too many attempts. Please wait a moment and try again.',
  [API_ERROR_CODES.DATABASE_ERROR]: "We're having trouble reaching the service. Please try again in a moment.",
  [API_ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'A service is temporarily unavailable. Please try again in a moment.',
  [API_ERROR_CODES.NETWORK_ERROR]: "You're offline or the connection was interrupted. Please check your connection.",
  [API_ERROR_CODES.TIMEOUT]: 'The request is taking too long. Please try again.',
  [API_ERROR_CODES.CANCELED]: 'The request was cancelled.',
  [API_ERROR_CODES.INTERNAL_SERVER_ERROR]: defaultMessage,
  [API_ERROR_CODES.UNKNOWN_ERROR]: defaultMessage,
};

const statusToCode = {
  400: API_ERROR_CODES.BAD_REQUEST,
  401: API_ERROR_CODES.AUTHENTICATION_ERROR,
  403: API_ERROR_CODES.AUTHORIZATION_ERROR,
  404: API_ERROR_CODES.NOT_FOUND,
  409: API_ERROR_CODES.CONFLICT,
  422: API_ERROR_CODES.VALIDATION_ERROR,
  429: API_ERROR_CODES.RATE_LIMITED,
  500: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
  502: API_ERROR_CODES.EXTERNAL_SERVICE_ERROR,
  503: API_ERROR_CODES.EXTERNAL_SERVICE_ERROR,
  504: API_ERROR_CODES.TIMEOUT,
};

const createFieldErrors = (details, legacyErrors) => {
  if (details && typeof details === 'object' && !Array.isArray(details)) return details;

  if (Array.isArray(legacyErrors)) {
    return legacyErrors.reduce((acc, item) => {
      if (item?.field) acc[item.field] = item.message || 'Invalid value.';
      return acc;
    }, {});
  }

  return {};
};

export const isApiError = (error) => Boolean(error?.isApiError);

export const normalizeApiError = (error, fallback = defaultMessage) => {
  if (isApiError(error)) return error;

  const payload = error?.response?.data;
  const serverError = payload?.error;
  const status = error?.response?.status;
  const headerRequestId =
    error?.response?.headers?.['x-request-id'] ||
    error?.response?.headers?.get?.('x-request-id');
  const requestId =
    serverError?.requestId ||
    headerRequestId ||
    error?.config?.headers?.['X-Request-ID'] ||
    error?.requestId ||
    null;

  let code = serverError?.code || payload?.code || statusToCode[status] || API_ERROR_CODES.UNKNOWN_ERROR;
  let message = serverError?.message || payload?.message || messagesByCode[code] || fallback;

  if (error?.code === 'ERR_CANCELED') {
    code = API_ERROR_CODES.CANCELED;
    message = messagesByCode[code];
  } else if (error?.code === 'ECONNABORTED' || error?.message?.toLowerCase().includes('timeout')) {
    code = API_ERROR_CODES.TIMEOUT;
    message = messagesByCode[code];
  } else if (error?.request && !error?.response) {
    code = API_ERROR_CODES.NETWORK_ERROR;
    message =
      typeof navigator !== 'undefined' && !navigator.onLine
        ? "You're offline. Reconnect and try again."
        : messagesByCode[code];
  }

  return {
    isApiError: true,
    code,
    status,
    message: message || fallback,
    requestId,
    fieldErrors: createFieldErrors(serverError?.details || payload?.details, payload?.errors),
    details: serverError?.details || payload?.details || null,
    raw: payload || null,
  };
};

export const getApiErrorMessage = (error, fallback = defaultMessage) =>
  normalizeApiError(error, fallback).message;

export const getApiErrorRequestId = (error) => normalizeApiError(error).requestId;

export const isTransientApiError = (error) => {
  const normalized = normalizeApiError(error);
  return (
    normalized.code === API_ERROR_CODES.NETWORK_ERROR ||
    normalized.code === API_ERROR_CODES.TIMEOUT ||
    [502, 503, 504].includes(normalized.status)
  );
};

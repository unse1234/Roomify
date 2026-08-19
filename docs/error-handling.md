# Roomify Error Handling

Roomify uses one API error shape for backend failures:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "details": { "email": "Please enter a valid email address." },
    "requestId": "req_123"
  }
}
```

## Backend

- Use `AppError` helpers from `backend/src/errors/AppError.js` for expected failures.
- Let unexpected errors throw. Express forwards them to `errorHandler`.
- `requestContext` creates or accepts a safe `X-Request-ID` and returns it on the response.
- `normalizeErrorResponses` adapts older `{ message }` error responses to the new contract during migration.
- `normalizeError` translates known Mongoose, Multer, JSON parse, duplicate key, CORS, database, and external-service failures into safe errors.
- Production responses never expose stack traces, database messages, file paths, queries, tokens, cookies, or provider internals.

## Logging

Server logs are structured JSON through `backend/src/utils/logger.js`. Each request/error log includes the request ID, method, route, status code, duration, environment, and safe user ID when available. Sensitive fields such as passwords, tokens, cookies, authorization headers, secrets, and private keys are redacted.

## Frontend

- All HTTP calls go through `frontend/src/services/api.js`.
- The Axios client sets `X-Request-ID`, sends the httpOnly cookie, applies a timeout, and rejects with a normalized API error.
- Use `normalizeApiError`, `getApiErrorMessage`, and `getApiErrorRequestId` from `frontend/src/utils/apiError.js`.
- Field validation errors live in `normalized.fieldErrors` and should be rendered inline without clearing user input.
- A 401 dispatches `roomify:auth-expired`; `AuthProvider` clears stale user state so protected routes can recover naturally.
- `ErrorBoundary` catches unexpected render/runtime errors and shows retry/home recovery actions.

## Retry Policy

React Query retries read queries only for transient failures: network errors, timeouts, 502, 503, and 504. Mutations are not retried automatically because repeated writes can create duplicate bookings, messages, uploads, or destructive actions.

## Adding Error Codes

Add meaningful shared codes in `backend/src/errors/errorCodes.js`. Prefer behavior-level codes such as `BOOKING_CONFLICT` over one-off line-of-code names. Frontend-specific handling can be added to `frontend/src/utils/apiError.js` when the UI needs a tailored message.

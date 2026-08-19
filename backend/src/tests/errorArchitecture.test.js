import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { AppError, validationError } from "../errors/AppError.js";
import { ERROR_CODES } from "../errors/errorCodes.js";
import { normalizeError, toErrorResponse } from "../errors/normalizeError.js";
import { createRequestId, normalizeRequestId } from "../utils/requestId.js";

test("builds the standard API error response with a request id", () => {
  const error = validationError({ email: "Please enter a valid email address." });
  const response = toErrorResponse(error, "req_test123");

  assert.equal(response.statusCode, 422);
  assert.deepEqual(response.body, {
    success: false,
    error: {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "Please correct the highlighted fields.",
      details: { email: "Please enter a valid email address." },
      requestId: "req_test123",
    },
  });
});

test("does not expose production internals for server errors", () => {
  const previousEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  const error = new AppError({
    code: ERROR_CODES.DATABASE_ERROR,
    message: "MongoServerSelectionError: internal host leaked",
    statusCode: 503,
    expose: false,
  });
  const response = toErrorResponse(error, "req_prod123");

  assert.equal(response.body.error.code, ERROR_CODES.INTERNAL_SERVER_ERROR);
  assert.equal(response.body.error.message, "Something went wrong. Please try again.");
  assert.equal(response.body.error.requestId, "req_prod123");

  process.env.NODE_ENV = previousEnv;
});

test("normalizes mongoose validation errors to field details", () => {
  const error = new mongoose.Error.ValidationError();
  error.addError("title", new mongoose.Error.ValidatorError({ message: "Title is required." }));

  const normalized = normalizeError(error);

  assert.equal(normalized.code, ERROR_CODES.VALIDATION_ERROR);
  assert.equal(normalized.statusCode, 422);
  assert.deepEqual(normalized.details, { title: "Title is required." });
});

test("normalizes duplicate key errors without leaking database details", () => {
  const normalized = normalizeError({ code: 11000, keyValue: { email: "user@example.com" } });

  assert.equal(normalized.code, ERROR_CODES.CONFLICT);
  assert.equal(normalized.statusCode, 409);
  assert.deepEqual(normalized.details, { email: "email already exists." });
});

test("creates or accepts safe request ids", () => {
  assert.match(createRequestId(), /^req_[a-f0-9]{32}$/);
  assert.equal(normalizeRequestId("req_existing123"), "req_existing123");
  assert.match(normalizeRequestId("bad id with spaces"), /^req_[a-f0-9]{32}$/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  API_ERROR_CODES,
  getApiErrorMessage,
  normalizeApiError,
  isTransientApiError,
} from '../utils/apiError.js';

test('normalizes the standard backend error contract', () => {
  const normalized = normalizeApiError({
    response: {
      status: 422,
      data: {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please correct the highlighted fields.',
          details: { email: 'Please enter a valid email address.' },
          requestId: 'req_123',
        },
      },
      headers: { 'x-request-id': 'req_123' },
    },
  });

  assert.equal(normalized.code, API_ERROR_CODES.VALIDATION_ERROR);
  assert.equal(normalized.status, 422);
  assert.equal(normalized.requestId, 'req_123');
  assert.deepEqual(normalized.fieldErrors, { email: 'Please enter a valid email address.' });
});

test('normalizes legacy validation arrays', () => {
  const normalized = normalizeApiError({
    response: {
      status: 422,
      data: {
        message: 'Validation failed',
        errors: [{ field: 'name', message: 'Name is required.' }],
      },
      headers: { 'x-request-id': 'req_legacy' },
    },
  });

  assert.equal(normalized.code, API_ERROR_CODES.VALIDATION_ERROR);
  assert.equal(normalized.requestId, 'req_legacy');
  assert.deepEqual(normalized.fieldErrors, { name: 'Name is required.' });
});

test('classifies timeouts and transient errors for retryable reads', () => {
  const timeout = normalizeApiError({ code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' });

  assert.equal(timeout.code, API_ERROR_CODES.TIMEOUT);
  assert.equal(getApiErrorMessage(timeout), 'The request is taking too long. Please try again.');
  assert.equal(isTransientApiError(timeout), true);
});

test('classifies cancelled requests as non-transient', () => {
  const canceled = normalizeApiError({ code: 'ERR_CANCELED' });

  assert.equal(canceled.code, API_ERROR_CODES.CANCELED);
  assert.equal(isTransientApiError(canceled), false);
});

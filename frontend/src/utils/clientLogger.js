const sanitize = (meta = {}) => {
  const blocked = new Set(['password', 'token', 'authorization', 'cookie', 'jwt']);

  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => [
      key,
      blocked.has(key) ? '[REDACTED]' : value,
    ])
  );
};

export const logClientError = (event, error, meta = {}) => {
  const payload = sanitize({
    event,
    message: error?.message,
    code: error?.code,
    status: error?.status,
    requestId: error?.requestId,
    ...meta,
  });

  if (import.meta.env.DEV) {
    console.error('[Roomify]', payload);
  }
};

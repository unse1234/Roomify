import crypto from "crypto";

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9_.:-]{8,80}$/;

export const createRequestId = () => `req_${crypto.randomUUID().replaceAll("-", "")}`;

export const normalizeRequestId = (value) => {
  const requestId = Array.isArray(value) ? value[0] : value;
  if (typeof requestId === "string" && REQUEST_ID_PATTERN.test(requestId)) {
    return requestId;
  }
  return createRequestId();
};

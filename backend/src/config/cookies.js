import { config } from "./config.js";

/**
 * One place that decides how the auth cookie is set and cleared, driven by
 * config so a same-site deployment can tighten SameSite without a code
 * change. SameSite=None must be Secure; otherwise Secure follows the
 * environment (browsers allow Secure cookies on localhost over http).
 */
export const AUTH_COOKIE = "jwt";

const sameSite = config.COOKIE_SAMESITE;
const secure = sameSite === "none" || config.isProduction;

const shared = {
  httpOnly: true,
  secure,
  sameSite,
  path: "/",
};

export const authCookieOptions = {
  ...shared,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const clearCookieOptions = {
  ...shared,
  expires: new Date(0),
};

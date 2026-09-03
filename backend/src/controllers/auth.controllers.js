import User from "../models/users.model.js";
import generateToken from "../utils/generateToken.js";
import { conflict, unauthenticated } from "../errors/AppError.js";
import { ERROR_CODES } from "../errors/errorCodes.js";
import {
  AUTH_COOKIE,
  authCookieOptions,
  clearCookieOptions,
} from "../config/cookies.js";

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  roles: user.roles,
});

// @route   POST /api/auth/register
// @access  Public  (validated by registerSchema)
const registerUser = async (req, res) => {
  const { name, email, password, roles } = req.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw conflict(
      "An account with this email already exists",
      { email: "An account with this email already exists." },
      ERROR_CODES.CONFLICT,
    );
  }

  // SECURITY: never trust the client to assign 'admin' on signup. The schema
  // already restricts roles to guest/host; this is the second gate.
  const allowedSignupRoles = ["guest", "host"];
  const safeRoles = Array.isArray(roles)
    ? roles.filter((role) => allowedSignupRoles.includes(role))
    : undefined;

  const user = await User.create({
    name,
    email,
    password,
    ...(safeRoles?.length ? { roles: safeRoles } : {}),
  });

  res.cookie(AUTH_COOKIE, generateToken(user._id), authCookieOptions);
  res.status(201).json({ success: true, data: publicUser(user) });
};

// @route   POST /api/auth/login
// @access  Public  (validated by loginSchema)
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // password has select:false on the schema — must be explicitly requested.
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw unauthenticated(
      "Invalid email or password.",
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    );
  }

  res.cookie(AUTH_COOKIE, generateToken(user._id), authCookieOptions);
  res.status(200).json({ success: true, data: publicUser(user) });
};

// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
};

// @route   POST /api/auth/logout
// @access  Public
const logoutUser = async (req, res) => {
  res.cookie(AUTH_COOKIE, "", clearCookieOptions);
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

const authController = { registerUser, loginUser, getMe, logoutUser };

export default authController;

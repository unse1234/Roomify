
import User from "../models/users.model.js";
import generateToken from "../utils/generateToken.js";
import { badRequest, conflict, unauthenticated } from "../errors/AppError.js";
import { ERROR_CODES } from "../errors/errorCodes.js";

// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password, roles } = req.body;

  if (!name || !email || !password) {
    throw badRequest("Name, email and password are required", {
      name: !name ? "Name is required." : undefined,
      email: !email ? "Email is required." : undefined,
      password: !password ? "Password is required." : undefined,
    });
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw conflict(
      "An account with this email already exists",
      { email: "An account with this email already exists." },
      ERROR_CODES.CONFLICT,
    );
  }

  // SECURITY: never trust the client to assign 'admin' on signup
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

  const token = generateToken(user._id);

  res.cookie("jwt", token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
});
  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      roles: user.roles,
    },
  });
};

// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw badRequest("Email and password are required", {
      email: !email ? "Email is required." : undefined,
      password: !password ? "Password is required." : undefined,
    });
  }

  // password has select:false on the schema
  // must explicitly request it
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw unauthenticated("Invalid email or password.", ERROR_CODES.AUTH_INVALID_CREDENTIALS);
  }

  const token = generateToken(user._id);

  res.cookie("jwt", token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
});
  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      roles: user.roles,
    },
  });
};

// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
};

// @route   POST /api/auth/logout
// @access  Public
const logoutUser = async (req, res) => {
  res.cookie("jwt", "", {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  expires: new Date(0),
  path: "/",
});
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

const authController = {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
};

export default authController;

import User from '../models/users.model.js';
import generateToken from '../utils/generateToken.js';
import asyncHandler from '../middleware/asyncHandler.js';

// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, roles } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(409); // 409 Conflict — more accurate than 400 for "already exists"
    throw new Error('An account with this email already exists');
  }

  // SECURITY: never trust the client to assign 'admin' on signup
  const allowedSignupRoles = ['guest', 'host'];
  const safeRoles = Array.isArray(roles)
    ? roles.filter((r) => allowedSignupRoles.includes(r))
    : undefined;

  const user = await User.create({
    name,
    email,
    password,
    ...(safeRoles?.length ? { roles: safeRoles } : {}),
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    token: generateToken(user._id),
  });
});

// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  // password has select:false on the schema — must explicitly request it
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  res.status(200).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    token: generateToken(user._id),
  });
});

// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(req.user); // req.user set by `protect` middleware
});

export default { registerUser, loginUser, getMe };
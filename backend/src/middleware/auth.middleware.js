import jwt from "jsonwebtoken";
import User from "../models/users.model.js";
import { unauthenticated } from "../errors/AppError.js";
import { ERROR_CODES } from "../errors/errorCodes.js";

const protect = async (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return next(unauthenticated("Please sign in to continue.", ERROR_CODES.AUTH_UNAUTHORIZED));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return next(unauthenticated("Your session has expired. Please sign in again.", ERROR_CODES.AUTH_SESSION_EXPIRED));
    }

    return next();
  } catch (error) {
    return next(unauthenticated("Your session has expired. Please sign in again.", ERROR_CODES.AUTH_SESSION_EXPIRED));
  }
};

export default protect;

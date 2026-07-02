import jwt from "jsonwebtoken";
import User from "../models/users.model.js";

const protect = async (req, res, next) => {
  // Read JWT from cookie
  const token = req.cookies.jwt;

  // No token found
  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      res.status(401);
      throw new Error("User no longer exists");
    }

    next();
  } catch (error) {
    res.status(401);
    throw new Error("Not authorized, token failed");
  }
};

export default protect;

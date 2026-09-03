import jwt from "jsonwebtoken";
import { config } from "../config/config.js";

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
};

export default generateToken;

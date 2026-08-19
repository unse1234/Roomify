
import { forbidden, unauthenticated } from "../errors/AppError.js";
import { ERROR_CODES } from "../errors/errorCodes.js";

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(unauthenticated("Please sign in to continue.", ERROR_CODES.AUTH_UNAUTHORIZED));
    }

    const hasPermission = allowedRoles.some(role => req.user.hasRole(role));

    if (!hasPermission) {
      return next(forbidden("You do not have permission to perform this action."));
    }

    next();
  };
};

export default authorize;

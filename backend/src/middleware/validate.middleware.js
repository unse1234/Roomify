import { validationError } from "../errors/AppError.js";

export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const fieldErrors = result.error.issues.reduce((acc, issue) => {
        const field = issue.path.join(".") || "form";
        acc[field] = issue.message;
        return acc;
      }, {});

      return next(validationError(fieldErrors));
    }

    req.validated = req.validated || {};
    req.validated[source] = result.data;

    next();
  };
};

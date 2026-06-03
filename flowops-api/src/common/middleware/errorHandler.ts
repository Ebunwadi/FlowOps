import type { ErrorRequestHandler } from "express";
import type { Logger } from "pino";
import { ZodError } from "zod";

import { AppError } from "../errors/appError";
import { ValidationError } from "../errors/httpErrors";

function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ValidationError(
      "Validation failed",
      error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    );
  }

  return new AppError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal server error",
    statusCode: 500,
    expose: false
  });
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error, req, res, _next) => {
    const normalizedError = normalizeError(error);

    if (normalizedError.statusCode >= 500) {
      logger.error(
        {
          error,
          requestId: res.locals.requestId,
          method: req.method,
          path: req.path
        },
        "Unhandled request error"
      );
    }

    res.status(normalizedError.statusCode).json({
      success: false,
      message: normalizedError.expose ? normalizedError.message : "Internal server error",
      errors: normalizedError.details ?? []
    });
  };
}

import type { ErrorRequestHandler } from "express";
import type { Logger } from "pino";
import { ZodError } from "zod";

import { AppError } from "../errors/appError";
import { ValidationError } from "../errors/httpErrors";
import {
  formatApiErrorMessage,
  LogOrigin,
} from "../logging/logFormat";

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
    const path = req.originalUrl.split("?")[0] ?? req.originalUrl;
    const summary = normalizedError.expose
      ? normalizedError.message
      : "Internal server error";

    // 4xx responses are already summarised by requestLogger; log details for 5xx only.
    if (normalizedError.statusCode >= 500) {
      logger.error(
        {
          origin: LogOrigin.API,
          event: "http.error",
          errorCode: normalizedError.code,
          httpMethod: req.method,
          httpPath: path,
          httpStatus: normalizedError.statusCode,
          requestId: res.locals.requestId,
          error,
        },
        formatApiErrorMessage(
          req.method,
          path,
          normalizedError.statusCode,
          summary,
        ),
      );
    }

    res.status(normalizedError.statusCode).json({
      success: false,
      message: normalizedError.expose ? normalizedError.message : "Internal server error",
      errors: normalizedError.details ?? []
    });
  };
}

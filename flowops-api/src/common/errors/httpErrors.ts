import { AppError, type ErrorDetail } from "./appError";

export class ValidationError extends AppError {
  public constructor(message = "Validation failed", details?: ErrorDetail[]) {
    super({
      code: "VALIDATION_ERROR",
      details,
      message,
      statusCode: 400
    });
  }
}

export class AuthenticationError extends AppError {
  public constructor(message = "Authentication required") {
    super({
      code: "AUTHENTICATION_ERROR",
      message,
      statusCode: 401
    });
  }
}

export class AuthorizationError extends AppError {
  public constructor(message = "You do not have permission to perform this action") {
    super({
      code: "AUTHORIZATION_ERROR",
      message,
      statusCode: 403
    });
  }
}

export class NotFoundError extends AppError {
  public constructor(message = "Resource not found") {
    super({
      code: "NOT_FOUND",
      message,
      statusCode: 404
    });
  }
}

export class ConflictError extends AppError {
  public constructor(message = "Resource conflict") {
    super({
      code: "CONFLICT",
      message,
      statusCode: 409
    });
  }
}

export class ExternalServiceError extends AppError {
  public constructor(message = "External service unavailable") {
    super({
      code: "EXTERNAL_SERVICE_ERROR",
      expose: true,
      message,
      statusCode: 502
    });
  }
}

export class RateLimitError extends AppError {
  public constructor(message = "Too many requests") {
    super({
      code: "RATE_LIMIT_ERROR",
      message,
      statusCode: 429
    });
  }
}

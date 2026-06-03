export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "EXTERNAL_SERVICE_ERROR"
  | "RATE_LIMIT_ERROR"
  | "INTERNAL_SERVER_ERROR";

export interface ErrorDetail {
  field?: string;
  message: string;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: ErrorDetail[];
  public readonly expose;
  public readonly statusCode;

  public constructor(params: {
    code: ErrorCode;
    message: string;
    statusCode: number;
    details?: ErrorDetail[];
    expose?: boolean;
  }) {
    super(params.message);
    this.name = "AppError";
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.details = params.details;
    this.expose = params.expose ?? params.statusCode < 500;
  }
}

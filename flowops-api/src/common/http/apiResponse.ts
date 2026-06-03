import type { Response } from "express";

interface SuccessResponse<TData> {
  data: TData;
  message?: string;
  statusCode?: number;
}

export function sendSuccess<TData>(
  res: Response,
  { data, message = "OK", statusCode = 200 }: SuccessResponse<TData>
): void {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

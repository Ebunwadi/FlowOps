/** Where a log entry was produced. */
export const LogOrigin = {
  API: "api",
  UI: "ui",
} as const;

export type LogOriginValue = (typeof LogOrigin)[keyof typeof LogOrigin];

export function formatApiRequestMessage(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
): string {
  return `[API] ${method} ${path} returned ${statusCode} in ${durationMs}ms`;
}

export function formatApiErrorMessage(
  method: string,
  path: string,
  statusCode: number,
  summary: string,
): string {
  return `[API] ${method} ${path} failed with ${statusCode}: ${summary}`;
}

export function requestLogLevel(
  statusCode: number,
): "info" | "warn" | "error" {
  if (statusCode >= 500) {
    return "error";
  }

  if (statusCode >= 400) {
    return "warn";
  }

  return "info";
}

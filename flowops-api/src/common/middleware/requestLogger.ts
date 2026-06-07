import type { RequestHandler } from "express";
import type { Logger } from "pino";

import {
  formatApiRequestMessage,
  LogOrigin,
  requestLogLevel,
} from "../logging/logFormat";

function normalizePath(originalUrl: string): string {
  return originalUrl.split("?")[0] ?? originalUrl;
}

export function requestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    if (req.originalUrl.startsWith("/api/logs/client")) {
      next();
      return;
    }

    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
      const durationMs = Math.round(
        Number(process.hrtime.bigint() - startedAt) / 1_000_000,
      );
      const path = normalizePath(req.originalUrl);
      const level = requestLogLevel(res.statusCode);

      logger[level](
        {
          origin: LogOrigin.API,
          event: "http.request",
          httpMethod: req.method,
          httpPath: path,
          httpStatus: res.statusCode,
          durationMs,
          requestId: res.locals.requestId,
        },
        formatApiRequestMessage(req.method, path, res.statusCode, durationMs),
      );
    });

    next();
  };
}

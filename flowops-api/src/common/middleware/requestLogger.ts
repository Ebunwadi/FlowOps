import type { RequestHandler } from "express";
import type { Logger } from "pino";

export function requestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

      logger.info(
        {
          durationMs: Math.round(durationMs),
          method: req.method,
          path: req.originalUrl,
          requestId: res.locals.requestId,
          statusCode: res.statusCode
        },
        "HTTP request completed"
      );
    });

    next();
  };
}

import type { Logger } from "pino";

import { rootLoggerForChildren } from "../../config/logger";
import type { ClientLogEntry } from "./client-logs.schema";

function extractStructuredFields(context: Record<string, unknown> | undefined) {
  const { area, event, ...details } = context ?? {};

  return {
    area: typeof area === "string" ? area : undefined,
    event: typeof event === "string" ? event : undefined,
    details: Object.keys(details).length > 0 ? details : undefined,
  };
}

export function ingestClientLogs(_logger: Logger, logs: ClientLogEntry[]): number {
  const webLogger = rootLoggerForChildren.child({ service: "flowops-web" });

  for (const entry of logs) {
    const { area, event, details } = extractStructuredFields(entry.context);

    webLogger[entry.level](
      {
        origin: "ui",
        area,
        event,
        ...(details ?? {}),
        ...(entry.url ? { pageUrl: entry.url } : {}),
        ...(entry.userAgent ? { userAgent: entry.userAgent } : {}),
        ...(entry.timestamp ? { clientTimestamp: entry.timestamp } : {}),
      },
      entry.message,
    );
  }

  return logs.length;
}

import { z } from "zod";

export const clientLogLevelSchema = z.enum(["debug", "info", "warn", "error"]);

export const clientLogEntrySchema = z.object({
  level: clientLogLevelSchema,
  message: z.string().min(1).max(2_000),
  context: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
  url: z.string().max(2_000).optional(),
  userAgent: z.string().max(500).optional(),
});

export const ingestClientLogsSchema = z.object({
  logs: z.array(clientLogEntrySchema).min(1).max(50),
});

export type ClientLogEntry = z.infer<typeof clientLogEntrySchema>;
export type IngestClientLogsInput = z.infer<typeof ingestClientLogsSchema>;

import pino from "pino";

import { env } from "./env";

const STDOUT_TRANSPORT = {
  target: "pino/file",
  options: { destination: 1 },
} as const;

function createTransport(): pino.LoggerOptions["transport"] {
  const seqTransport = env.seqServerUrl
    ? {
        target: "@autotelic/pino-seq-transport",
        options: {
          loggerOpts: {
            serverUrl: env.seqServerUrl,
            ...(env.seqApiKey ? { apiKey: env.seqApiKey } : {}),
          },
        },
      }
    : null;

  if (seqTransport) {
    return {
      targets: [STDOUT_TRANSPORT, seqTransport],
    };
  }

  if (env.nodeEnv === "development" || env.nodeEnv === "test") {
    return STDOUT_TRANSPORT;
  }

  return undefined;
}

const rootLogger = pino({
  level: env.logLevel,
  transport: createTransport(),
});

/** API server logs — tagged with service flowops-api in Seq. */
export const logger = rootLogger.child({ service: "flowops-api" });

/** Root logger for creating service-specific child loggers (e.g. flowops-web). */
export const rootLoggerForChildren = rootLogger;

import { createServer } from "node:http";

import { createApp } from "./app";
import { disconnectDatabase } from "./config/database";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { LogOrigin } from "./common/logging/logFormat";

const app = createApp();
const server = createServer(app);

server.listen(env.port, () => {
  logger.info(
    {
      origin: LogOrigin.API,
      event: "app.started",
      environment: env.nodeEnv,
      port: env.port,
    },
    `[API] FlowOps API listening on port ${env.port} (${env.nodeEnv})`,
  );
});

function shutdown(signal: NodeJS.Signals): void {
  logger.info(
    { origin: LogOrigin.API, event: "app.shutdown", signal },
    `[API] Shutdown signal received (${signal})`,
  );

  server.close((error) => {
    if (error) {
      logger.error(
        { origin: LogOrigin.API, event: "app.shutdown_failed", error },
        "[API] Failed to close HTTP server",
      );
      process.exit(1);
    }

    void disconnectDatabase().finally(() => {
      logger.info(
        { origin: LogOrigin.API, event: "app.stopped" },
        "[API] HTTP server stopped",
      );
      process.exit(0);
    });
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

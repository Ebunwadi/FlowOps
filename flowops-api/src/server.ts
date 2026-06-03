import { createServer } from "node:http";

import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";

const app = createApp();
const server = createServer(app);

server.listen(env.port, () => {
  logger.info(
    {
      environment: env.nodeEnv,
      port: env.port
    },
    "FlowOps API started"
  );
});

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, "Shutdown signal received");

  server.close((error) => {
    if (error) {
      logger.error({ error }, "Failed to close HTTP server");
      process.exit(1);
    }

    logger.info("HTTP server closed");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

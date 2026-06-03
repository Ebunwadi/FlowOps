import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import { errorHandler } from "./common/middleware/errorHandler";
import { notFoundHandler } from "./common/middleware/notFoundHandler";
import { requestId } from "./common/middleware/requestId";
import { requestLogger } from "./common/middleware/requestLogger";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { openApiDocument } from "./openapi/openApiDocument";
import { apiRouter } from "./routes";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestId);
  app.use(requestLogger(logger));
  app.use(helmet());
  app.use(
    cors({
      credentials: true,
      origin: env.corsOrigins,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.use(env.apiPrefix, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}

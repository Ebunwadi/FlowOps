import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  API_PREFIX: z.string().startsWith("/").default("/api"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  apiPrefix: parsedEnv.API_PREFIX,
  corsOrigins: parsedEnv.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
  databaseUrl: parsedEnv.DATABASE_URL,
  logLevel: parsedEnv.LOG_LEVEL,
  nodeEnv: parsedEnv.NODE_ENV,
  port: parsedEnv.PORT,
};

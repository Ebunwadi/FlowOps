import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  API_PREFIX: z.string().startsWith("/").default("/api"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  SEQ_API_KEY: z.string().optional(),
  SEQ_SERVER_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
  KEYCLOAK_ISSUER: z.string().url().default("http://localhost:8080/realms/flowops"),
  KEYCLOAK_JWKS_URI: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
  KEYCLOAK_CLIENT_ID: z.string().min(1).default("flowops-web"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  EMAIL_TRANSPORT: z.enum(["console", "smtp"]).default("console"),
  EMAIL_FROM: z.string().min(1).default("noreply@flowops.dev"),
  APP_PUBLIC_URL: z.string().url().default("http://localhost:5173"),
  SMTP_HOST: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().optional(),
  ),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.preprocess(
    (value) => value === "true" || value === true,
    z.boolean().default(false),
  ),
  SMTP_USER: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().optional(),
  ),
  SMTP_PASSWORD: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().optional(),
  ),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  apiPrefix: parsedEnv.API_PREFIX,
  corsOrigins: parsedEnv.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
  databaseUrl: parsedEnv.DATABASE_URL,
  logLevel: parsedEnv.LOG_LEVEL,
  nodeEnv: parsedEnv.NODE_ENV,
  port: parsedEnv.PORT,
  seqApiKey: parsedEnv.SEQ_API_KEY,
  seqServerUrl: parsedEnv.SEQ_SERVER_URL,
  keycloakIssuer: parsedEnv.KEYCLOAK_ISSUER,
  keycloakJwksUri:
    parsedEnv.KEYCLOAK_JWKS_URI ??
    `${parsedEnv.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`,
  keycloakClientId: parsedEnv.KEYCLOAK_CLIENT_ID,
  redisUrl: parsedEnv.REDIS_URL,
  emailTransport: parsedEnv.EMAIL_TRANSPORT,
  emailFrom: parsedEnv.EMAIL_FROM,
  appPublicUrl: parsedEnv.APP_PUBLIC_URL,
  smtpHost: parsedEnv.SMTP_HOST,
  smtpPort: parsedEnv.SMTP_PORT,
  smtpSecure: parsedEnv.SMTP_SECURE,
  smtpUser: parsedEnv.SMTP_USER,
  smtpPassword: parsedEnv.SMTP_PASSWORD,
};

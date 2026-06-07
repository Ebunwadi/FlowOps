import { z } from "zod";

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default("http://localhost:5000/api"),
  VITE_KEYCLOAK_URL: z.string().url().default("http://localhost:8080"),
  VITE_KEYCLOAK_REALM: z.string().min(1).default("flowops"),
  VITE_KEYCLOAK_CLIENT_ID: z.string().min(1).default("flowops-web"),
  VITE_CLIENT_LOGGING: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
});

const parsedEnv = envSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_KEYCLOAK_URL: import.meta.env.VITE_KEYCLOAK_URL,
  VITE_KEYCLOAK_REALM: import.meta.env.VITE_KEYCLOAK_REALM,
  VITE_KEYCLOAK_CLIENT_ID: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  VITE_CLIENT_LOGGING: import.meta.env.VITE_CLIENT_LOGGING,
});

export const env = {
  apiBaseUrl: parsedEnv.VITE_API_BASE_URL.replace(/\/$/, ""),
  keycloakUrl: parsedEnv.VITE_KEYCLOAK_URL.replace(/\/$/, ""),
  keycloakRealm: parsedEnv.VITE_KEYCLOAK_REALM,
  keycloakClientId: parsedEnv.VITE_KEYCLOAK_CLIENT_ID,
  clientLoggingEnabled: parsedEnv.VITE_CLIENT_LOGGING,
};

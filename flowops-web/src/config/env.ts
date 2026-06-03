import { z } from "zod";

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default("http://localhost:5000/api"),
});

const parsedEnv = envSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
});

export const env = {
  apiBaseUrl: parsedEnv.VITE_API_BASE_URL.replace(/\/$/, ""),
};

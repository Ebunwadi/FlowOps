import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z.string().trim().min(2).max(100),
  scopes: z.array(z.string().trim().min(1)).optional(),
  expiresAt: z.coerce.date().optional(),
});

export const apiKeyParamsSchema = z.object({
  id: z.string().uuid(),
});

export type CreateApiKeyBody = z.infer<typeof createApiKeySchema>;
export type ApiKeyParams = z.infer<typeof apiKeyParamsSchema>;

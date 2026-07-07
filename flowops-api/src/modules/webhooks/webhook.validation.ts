import { z } from "zod";

import { WEBHOOK_EVENT_TYPES } from "./webhook-events";

const webhookEventSchema = z.enum(WEBHOOK_EVENT_TYPES);

export const createWebhookEndpointSchema = z.object({
  name: z.string().trim().min(2).max(100),
  url: z.string().trim().url().max(2048),
  events: z.array(webhookEventSchema).min(1),
  isActive: z.boolean().optional(),
});

export const updateWebhookEndpointSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    url: z.string().trim().url().max(2048).optional(),
    events: z.array(webhookEventSchema).min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.url !== undefined ||
      value.events !== undefined ||
      value.isActive !== undefined,
    {
      message: "At least one field must be provided",
    },
  );

export const webhookEndpointParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listWebhookDeliveriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type CreateWebhookEndpointBody = z.infer<typeof createWebhookEndpointSchema>;
export type UpdateWebhookEndpointBody = z.infer<typeof updateWebhookEndpointSchema>;
export type WebhookEndpointParams = z.infer<typeof webhookEndpointParamsSchema>;
export type ListWebhookDeliveriesQuery = z.infer<
  typeof listWebhookDeliveriesQuerySchema
>;

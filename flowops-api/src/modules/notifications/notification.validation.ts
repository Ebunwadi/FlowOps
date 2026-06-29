import { z } from "zod";

export const notificationParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listNotificationsQuerySchema = z.object({
  isRead: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }

      return value === "true";
    }),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type NotificationParams = z.infer<typeof notificationParamsSchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

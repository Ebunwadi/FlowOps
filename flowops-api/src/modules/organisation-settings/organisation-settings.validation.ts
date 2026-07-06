import { z } from "zod";

export const updateOrganisationSettingsSchema = z
  .object({
    allowAiFeatures: z.boolean().optional(),
    allowWebhooks: z.boolean().optional(),
    allowApiKeys: z.boolean().optional(),
    defaultSlaHours: z.number().int().positive().nullable().optional(),
    requireCommentsOnReject: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.allowAiFeatures !== undefined ||
      value.allowWebhooks !== undefined ||
      value.allowApiKeys !== undefined ||
      value.defaultSlaHours !== undefined ||
      value.requireCommentsOnReject !== undefined,
    {
      message: "At least one setting must be provided",
    },
  );

export type UpdateOrganisationSettingsBody = z.infer<
  typeof updateOrganisationSettingsSchema
>;

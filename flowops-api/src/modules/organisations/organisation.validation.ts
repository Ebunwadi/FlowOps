import { z } from "zod";

const organisationSlugSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must use lowercase letters, numbers, and hyphens only",
  )
  .transform((value) => value.toLowerCase());

export const createOrganisationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: organisationSlugSchema,
});

export const updateOrganisationSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    slug: organisationSlugSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.slug !== undefined, {
    message: "At least one field must be provided",
  });

export type CreateOrganisationBody = z.infer<typeof createOrganisationSchema>;
export type UpdateOrganisationBody = z.infer<typeof updateOrganisationSchema>;

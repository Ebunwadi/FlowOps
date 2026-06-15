import { z } from "zod";

const organisationSlugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(100, "Slug must be at most 100 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and hyphens only",
  );

export const organisationSetupSchema = z.object({
  name: z.string().trim().min(1, "Organisation name is required").max(200),
  slug: organisationSlugSchema,
  industryType: z.string().trim().max(100).optional().or(z.literal("")),
  teamSize: z.string().trim().max(50).optional().or(z.literal("")),
});

export type OrganisationSetupFormValues = z.infer<typeof organisationSetupSchema>;

export function slugifyOrganisationName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

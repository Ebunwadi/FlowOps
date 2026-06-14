import { z } from "zod";

export const updateMemberRoleSchema = z.object({
  roleId: z.string().uuid(),
});

export type UpdateMemberRoleBody = z.infer<typeof updateMemberRoleSchema>;

export const organisationMemberParamsSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
});

export type OrganisationMemberParams = z.infer<typeof organisationMemberParamsSchema>;

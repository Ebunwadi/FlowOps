import { apiClient } from "@/api/client";
import type { OrganisationMember, OrganisationRole } from "@/types/member";

export function listOrganisationMembers(
  organisationId: string,
): Promise<OrganisationMember[]> {
  return apiClient<OrganisationMember[]>(`/organisations/${organisationId}/members`);
}

export function listOrganisationRoles(
  organisationId: string,
): Promise<OrganisationRole[]> {
  return apiClient<OrganisationRole[]>(`/organisations/${organisationId}/roles`);
}

export function updateOrganisationMemberRole(
  organisationId: string,
  memberId: string,
  roleId: string,
): Promise<OrganisationMember> {
  return apiClient<OrganisationMember>(
    `/organisations/${organisationId}/members/${memberId}/role`,
    {
      method: "PATCH",
      body: { roleId },
    },
  );
}

export function removeOrganisationMember(
  organisationId: string,
  memberId: string,
): Promise<null> {
  return apiClient<null>(`/organisations/${organisationId}/members/${memberId}`, {
    method: "DELETE",
  });
}

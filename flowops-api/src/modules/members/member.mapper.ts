import type { OrganisationMemberWithUserAndRole } from "./member.repository";

export interface OrganisationMemberResponse {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: {
    id: string;
    name: string;
  };
  status: string;
  joinedAt: string;
}

export function toOrganisationMemberResponse(
  member: OrganisationMemberWithUserAndRole,
): OrganisationMemberResponse {
  return {
    id: member.id,
    userId: member.userId,
    email: member.user.email,
    firstName: member.user.firstName,
    lastName: member.user.lastName,
    role: {
      id: member.role.id,
      name: member.role.name,
    },
    status: member.status,
    joinedAt: member.joinedAt.toISOString(),
  };
}

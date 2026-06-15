export interface OrganisationMember {
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

export interface OrganisationRole {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
}

export function formatMemberName(member: OrganisationMember): string {
  const parts = [member.firstName, member.lastName].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return member.email;
}

export function formatMemberStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

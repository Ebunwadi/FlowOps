export interface OrganisationMembershipAccess {
  membershipId: string;
  role: {
    id: string;
    name: string;
  };
  permissions: string[];
}

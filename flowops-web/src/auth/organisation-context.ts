import { createContext } from "react";

import type { OrganisationSummary } from "@/types/organisation";
import type { OrganisationMembershipAccess } from "@/types/membership";

export interface OrganisationContextValue {
  organisations: OrganisationSummary[];
  organisationsLoading: boolean;
  organisationsError: string | null;
  currentOrganisation: OrganisationSummary | null;
  membershipAccess: OrganisationMembershipAccess | null;
  membershipAccessLoading: boolean;
  setCurrentOrganisation: (organisation: OrganisationSummary) => void;
  refreshOrganisations: () => Promise<OrganisationSummary[]>;
}

export const OrganisationContext = createContext<OrganisationContextValue | null>(
  null,
);

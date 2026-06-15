import { createContext } from "react";

import type { OrganisationSummary } from "@/types/organisation";

export interface OrganisationContextValue {
  organisations: OrganisationSummary[];
  organisationsLoading: boolean;
  organisationsError: string | null;
  currentOrganisation: OrganisationSummary | null;
  setCurrentOrganisation: (organisation: OrganisationSummary) => void;
  refreshOrganisations: () => Promise<OrganisationSummary[]>;
}

export const OrganisationContext = createContext<OrganisationContextValue | null>(
  null,
);

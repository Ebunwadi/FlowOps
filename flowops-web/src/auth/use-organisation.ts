import { useContext } from "react";

import { OrganisationContext } from "@/auth/organisation-context";

export function useOrganisation() {
  const context = useContext(OrganisationContext);

  if (!context) {
    throw new Error("useOrganisation must be used within OrganisationProvider");
  }

  return context;
}

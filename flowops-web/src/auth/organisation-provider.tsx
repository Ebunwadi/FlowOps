import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { listOrganisations, getOrganisationAccess } from "@/api/organisations";
import { useAuth } from "@/auth/use-auth";
import { OrganisationContext } from "@/auth/organisation-context";
import {
  clearOrganisationIdGetter,
  registerOrganisationIdGetter,
} from "@/auth/organisation-context-access";
import {
  clearStoredOrganisationId,
  readStoredOrganisationId,
  writeStoredOrganisationId,
} from "@/lib/organisation-storage";
import { clientLogger } from "@/lib/logger";
import type { OrganisationSummary } from "@/types/organisation";

interface OrganisationProviderProps {
  children: ReactNode;
}

function resolveCurrentOrganisation(
  organisations: OrganisationSummary[],
  selectedOrganisationId: string | null,
): OrganisationSummary | null {
  if (organisations.length === 0) {
    return null;
  }

  if (selectedOrganisationId) {
    const selectedOrganisation = organisations.find(
      (organisation) => organisation.id === selectedOrganisationId,
    );

    if (selectedOrganisation) {
      return selectedOrganisation;
    }
  }

  return organisations[0] ?? null;
}

export function OrganisationProvider({ children }: OrganisationProviderProps) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const currentOrganisationIdRef = useRef<string | undefined>(
    readStoredOrganisationId() ?? undefined,
  );
  const [selectedOrganisationId, setSelectedOrganisationId] = useState<string | null>(
    () => readStoredOrganisationId(),
  );

  const organisationsQuery = useQuery({
    queryKey: ["organisations"],
    queryFn: listOrganisations,
    enabled: isAuthenticated,
  });

  const organisations = useMemo(
    () => organisationsQuery.data ?? [],
    [organisationsQuery.data],
  );

  const currentOrganisation = useMemo(
    () =>
      isAuthenticated
        ? resolveCurrentOrganisation(organisations, selectedOrganisationId)
        : null,
    [isAuthenticated, organisations, selectedOrganisationId],
  );

  const accessQuery = useQuery({
    queryKey: ["organisations", currentOrganisation?.id, "access"],
    queryFn: getOrganisationAccess,
    enabled: isAuthenticated && Boolean(currentOrganisation?.id),
  });

  useEffect(() => {
    if (currentOrganisation) {
      writeStoredOrganisationId(currentOrganisation.id);
      return;
    }

    if (!isAuthenticated) {
      clearStoredOrganisationId();
    }
  }, [currentOrganisation, isAuthenticated]);

  const setCurrentOrganisation = useCallback((organisation: OrganisationSummary) => {
    currentOrganisationIdRef.current = organisation.id;
    setSelectedOrganisationId(organisation.id);
    writeStoredOrganisationId(organisation.id);
    clientLogger.info({
      area: "organisation",
      event: "context.selected",
      message: "Current organisation context updated",
      context: {
        organisationId: organisation.id,
        organisationName: organisation.name,
        organisationRole: organisation.role,
      },
    });
  }, []);

  const refreshOrganisations = useCallback(async () => {
    const nextOrganisations = await queryClient.fetchQuery({
      queryKey: ["organisations"],
      queryFn: listOrganisations,
    });

    const nextOrganisation = resolveCurrentOrganisation(
      nextOrganisations,
      selectedOrganisationId,
    );

    if (nextOrganisation) {
      setSelectedOrganisationId(nextOrganisation.id);
      writeStoredOrganisationId(nextOrganisation.id);
    }

    return nextOrganisations;
  }, [queryClient, selectedOrganisationId]);

  useEffect(() => {
    currentOrganisationIdRef.current = currentOrganisation?.id;
  }, [currentOrganisation?.id]);

  useEffect(() => {
    registerOrganisationIdGetter(() => currentOrganisationIdRef.current);

    return () => {
      clearOrganisationIdGetter();
    };
  }, []);

  const organisationsError =
    organisationsQuery.error instanceof Error
      ? organisationsQuery.error.message
      : organisationsQuery.error
        ? "Unable to load organisations."
        : null;

  const value = useMemo(
    () => ({
      organisations,
      organisationsLoading: organisationsQuery.isLoading,
      organisationsError,
      currentOrganisation,
      membershipAccess: accessQuery.data ?? null,
      membershipAccessLoading: accessQuery.isLoading,
      setCurrentOrganisation,
      refreshOrganisations,
    }),
    [
      accessQuery.data,
      accessQuery.isLoading,
      currentOrganisation,
      organisations,
      organisationsError,
      organisationsQuery.isLoading,
      refreshOrganisations,
      setCurrentOrganisation,
    ],
  );

  return (
    <OrganisationContext.Provider value={value}>
      {children}
    </OrganisationContext.Provider>
  );
}

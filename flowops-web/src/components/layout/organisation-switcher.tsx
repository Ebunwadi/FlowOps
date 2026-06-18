import { useAuth } from "@/auth/use-auth";
import { useOrganisation } from "@/auth/use-organisation";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { OrganisationSummary } from "@/types/organisation";

function formatOrganisationOption(organisation: OrganisationSummary): string {
  return `${organisation.name} (${organisation.role})`;
}

export function OrganisationSwitcher() {
  const { initialized, isAuthenticated } = useAuth();
  const {
    organisations,
    organisationsLoading,
    currentOrganisation,
    setCurrentOrganisation,
  } = useOrganisation();

  if (!initialized || !isAuthenticated) {
    return null;
  }

  if (organisationsLoading) {
    return (
      <p aria-live="polite" className="text-sm text-muted-foreground">
        Loading workspace...
      </p>
    );
  }

  if (organisations.length === 0 || !currentOrganisation) {
    return null;
  }

  if (organisations.length === 1) {
    return (
      <div className="min-w-0 text-right sm:text-left">
        <p className="truncate text-sm font-medium">{currentOrganisation.name}</p>
        <p className="text-xs text-muted-foreground">{currentOrganisation.role}</p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label className="sr-only" htmlFor="organisation-switcher">
        Current organisation
      </Label>
      <Select
        aria-label="Switch organisation"
        className="w-full min-w-[12rem] max-w-[16rem] sm:w-56"
        id="organisation-switcher"
        onChange={(event) => {
          const nextOrganisation = organisations.find(
            (organisation) => organisation.id === event.target.value,
          );

          if (nextOrganisation) {
            setCurrentOrganisation(nextOrganisation);
          }
        }}
        value={currentOrganisation.id}
      >
        {organisations.map((organisation) => (
          <option key={organisation.id} value={organisation.id}>
            {formatOrganisationOption(organisation)}
          </option>
        ))}
      </Select>
    </div>
  );
}

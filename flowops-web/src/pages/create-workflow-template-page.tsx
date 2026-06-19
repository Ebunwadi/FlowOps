import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";

import { listOrganisationRoles } from "@/api/members";
import { useOrganisation } from "@/auth/use-organisation";
import { usePermissions } from "@/auth/use-permissions";
import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import { WorkflowTemplateForm } from "@/components/workflows/workflow-template-form";
import { Button } from "@/components/ui/button";

export function CreateWorkflowTemplatePage() {
  const { currentOrganisation } = useOrganisation();
  const { hasPermission, membershipAccessLoading } = usePermissions();

  const canCreate = hasPermission("workflows:create");

  const rolesQuery = useQuery({
    queryKey: ["organisations", currentOrganisation?.id, "roles"],
    queryFn: () => listOrganisationRoles(currentOrganisation!.id),
    enabled: Boolean(currentOrganisation?.id) && canCreate,
  });

  if (!currentOrganisation) {
    return <Navigate replace to="/organisation/setup" />;
  }

  if (membershipAccessLoading) {
    return <AuthLoadingScreen message="Checking your permissions..." />;
  }

  if (!canCreate) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Create workflow</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You do not have permission to create workflow templates.
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Contact an organisation admin if you need access to build workflows.
        </div>
        <Button asChild type="button" variant="outline">
          <Link to="/workflows">Back to workflows</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link className="hover:text-foreground" to="/workflows">
              Workflows
            </Link>
            <span className="mx-2">/</span>
            <span>Create</span>
          </p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight">
            Create workflow template
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build the request form and approval sequence for {currentOrganisation.name}.
          </p>
        </div>
        <Button asChild type="button" variant="outline">
          <Link to="/workflows">Back to list</Link>
        </Button>
      </div>

      <WorkflowTemplateForm
        cancelTo="/workflows"
        mode="create"
        roles={rolesQuery.data ?? []}
        rolesLoading={rolesQuery.isLoading}
      />
    </div>
  );
}

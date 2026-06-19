import { Link } from "react-router-dom";

import { useOrganisation } from "@/auth/use-organisation";
import { usePermissions } from "@/auth/use-permissions";
import { WorkflowTemplatesTable } from "@/components/workflows/workflow-templates-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function WorkflowsPage() {
  const { currentOrganisation } = useOrganisation();
  const { hasPermission, membershipAccessLoading } = usePermissions();

  const canView = hasPermission("workflows:view");
  const canCreate = hasPermission("workflows:create");
  const canUpdate = hasPermission("workflows:update");
  const canActivate = hasPermission("workflows:activate");
  const canDeactivate = hasPermission("workflows:deactivate");
  const canArchive = hasPermission("workflows:delete");

  const permissions = {
    canView,
    canCreate,
    canUpdate,
    canActivate,
    canDeactivate,
    canArchive,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
            Workflow templates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Design, publish, and manage approval workflows
            {currentOrganisation ? ` for ${currentOrganisation.name}` : ""}.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            disabled
            title="AI-assisted workflow generation coming soon"
            type="button"
            variant="outline"
          >
            Generate with AI
          </Button>
          {canCreate ? (
            <Button asChild type="button">
              <Link to="/workflows/new">Create workflow</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">All templates</CardTitle>
          <CardDescription>
            {membershipAccessLoading
              ? "Loading permissions…"
              : canView
                ? "Browse and manage workflow templates used across your organisation."
                : "You do not have permission to view workflow templates."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {membershipAccessLoading ? (
            <p className="text-sm text-muted-foreground">Loading permissions…</p>
          ) : (
            <WorkflowTemplatesTable permissions={permissions} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

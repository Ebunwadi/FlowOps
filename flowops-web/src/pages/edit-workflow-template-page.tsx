import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";

import { listOrganisationRoles } from "@/api/members";
import { getWorkflowTemplateById } from "@/api/workflow-templates";
import { useOrganisation } from "@/auth/use-organisation";
import { usePermissions } from "@/auth/use-permissions";
import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import { WorkflowTemplateForm } from "@/components/workflows/workflow-template-form";
import { Button } from "@/components/ui/button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { toWorkflowTemplateFormValues } from "@/schemas/workflow-template.schema";
import { ApiClientError } from "@/types/api";

export function EditWorkflowTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const { currentOrganisation } = useOrganisation();
  const { hasPermission, membershipAccessLoading } = usePermissions();

  const canUpdate = hasPermission("workflows:update");

  const templateQuery = useQuery({
    queryKey: ["workflow-templates", id],
    queryFn: () => getWorkflowTemplateById(id!),
    enabled: Boolean(id) && canUpdate,
  });

  const rolesQuery = useQuery({
    queryKey: ["organisations", currentOrganisation?.id, "roles"],
    queryFn: () => listOrganisationRoles(currentOrganisation!.id),
    enabled: Boolean(currentOrganisation?.id) && canUpdate,
  });

  if (!currentOrganisation) {
    return <Navigate replace to="/organisation/setup" />;
  }

  if (!id) {
    return <Navigate replace to="/workflows" />;
  }

  if (membershipAccessLoading) {
    return <AuthLoadingScreen message="Checking your permissions..." />;
  }

  if (!canUpdate) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Edit workflow</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You do not have permission to edit workflow templates.
          </p>
        </div>
        <DismissibleAlert variant="warning">
          Contact an organisation admin if you need access to edit workflows.
        </DismissibleAlert>
        <Button asChild type="button" variant="outline">
          <Link to={`/workflows/${id}`}>Back to template</Link>
        </Button>
      </div>
    );
  }

  if (templateQuery.isLoading || rolesQuery.isLoading) {
    return <AuthLoadingScreen message="Loading workflow template..." />;
  }

  if (templateQuery.isError || !templateQuery.data) {
    return (
      <div className="space-y-4">
        <h1 className="text-[28px] font-semibold tracking-tight">Edit workflow</h1>
        <DismissibleAlert
          messageKey={
            templateQuery.error instanceof ApiClientError
              ? templateQuery.error.message
              : "load-error"
          }
          variant="error"
        >
          {templateQuery.error instanceof ApiClientError
            ? templateQuery.error.message
            : "Unable to load workflow template."}
        </DismissibleAlert>
        <Button asChild type="button" variant="outline">
          <Link to="/workflows">Back to workflows</Link>
        </Button>
      </div>
    );
  }

  const template = templateQuery.data;
  const initialValues = toWorkflowTemplateFormValues(template);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link className="hover:text-foreground" to="/workflows">
              Workflows
            </Link>
            <span className="mx-2">/</span>
            <Link className="hover:text-foreground" to={`/workflows/${template.id}`}>
              {template.name}
            </Link>
            <span className="mx-2">/</span>
            <span>Edit</span>
          </p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight">
            Edit workflow template
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the form fields and approval steps for this template.
          </p>
        </div>
        <Button asChild type="button" variant="outline">
          <Link to={`/workflows/${template.id}`}>Cancel</Link>
        </Button>
      </div>

      <WorkflowTemplateForm
        cancelTo={`/workflows/${template.id}`}
        initialValues={initialValues}
        mode="edit"
        previewStatus={template.status}
        roles={rolesQuery.data ?? []}
        rolesLoading={rolesQuery.isLoading}
        templateId={template.id}
      />
    </div>
  );
}

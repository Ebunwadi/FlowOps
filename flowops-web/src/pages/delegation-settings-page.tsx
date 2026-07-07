import { useQuery } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";

import { listPendingApprovals } from "@/api/approvals";
import { useOrganisation } from "@/auth/use-organisation";
import { usePermissions } from "@/auth/use-permissions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { formatApiErrorMessage } from "@/lib/api-errors";
import { formatRequesterName } from "@/types/workflow-request";

function PermissionBadge({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span
      className={
        enabled
          ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
          : "inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
      }
    >
      {label}: {enabled ? "Yes" : "No"}
    </span>
  );
}

export function DelegationSettingsPage() {
  const { currentOrganisation } = useOrganisation();
  const { hasPermission, membershipAccessLoading } = usePermissions();

  const canViewApprovals = hasPermission("approvals:view");
  const canDelegate = hasPermission("approvals:delegate");

  const pendingApprovalsQuery = useQuery({
    queryKey: ["pending-approvals", "delegation-settings"],
    queryFn: () => listPendingApprovals({ page: 1, limit: 10 }),
    enabled: Boolean(currentOrganisation?.id) && canViewApprovals,
  });

  if (!currentOrganisation) {
    return <Navigate replace to="/organisation/setup" />;
  }

  const reassignedItems =
    pendingApprovalsQuery.data?.items.filter(
      (item) => item.outOfOfficeReassignment !== undefined,
    ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link className="hover:text-foreground" to="/settings">
              Settings
            </Link>
            <span className="mx-2">/</span>
            <span>Delegation</span>
          </p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight">
            Approval delegation
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Understand how to hand off approval work in {currentOrganisation.name}.
          </p>
        </div>
        <Button asChild type="button" variant="outline">
          <Link to="/settings">Back to settings</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Your permissions</CardTitle>
          <CardDescription>
            Delegation options depend on your role and the workflow step settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {membershipAccessLoading ? (
            <p className="text-sm text-muted-foreground">Loading permissions…</p>
          ) : (
            <>
              <PermissionBadge enabled={canViewApprovals} label="View approvals" />
              <PermissionBadge enabled={canDelegate} label="Delegate approvals" />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Request-level delegation</CardTitle>
          <CardDescription>
            When a workflow step allows delegation, approvers can assign a specific
            pending request to another member from the approval review screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Manual delegation applies to one request and one step at a time. The
            delegate receives a notification and can approve, reject, or request
            changes on your behalf.
          </p>
          <p>
            Delegation is only available when the workflow template enables it for
            the current step. You cannot delegate to yourself or to the requester.
          </p>
          {canViewApprovals ? (
            <Button asChild type="button" variant="outline">
              <Link to="/approvals">Open pending approvals</Link>
            </Button>
          ) : (
            <DismissibleAlert variant="warning">
              Your role cannot view pending approvals. Contact an admin if you need
              approver access.
            </DismissibleAlert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Out-of-office reassignment</CardTitle>
          <CardDescription>
            Automatic routing sends approval notifications to your delegate while
            you are away.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Unlike request-level delegation, out-of-office rules apply across all
            requests that would normally notify you during the configured dates.
          </p>
          <Button asChild type="button" variant="outline">
            <Link to="/settings/out-of-office">Manage out-of-office rules</Link>
          </Button>
        </CardContent>
      </Card>

      {canViewApprovals ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Reassigned to you</CardTitle>
            <CardDescription>
              Pending approvals currently routed through out-of-office rules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingApprovalsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading approvals…</p>
            ) : pendingApprovalsQuery.isError ? (
              <DismissibleAlert variant="error">
                {formatApiErrorMessage(pendingApprovalsQuery.error)}
              </DismissibleAlert>
            ) : reassignedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No out-of-office reassignments are waiting for you right now.
              </p>
            ) : (
              <ul className="space-y-3">
                {reassignedItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {item.title ?? "Untitled request"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Covering for{" "}
                        {item.outOfOfficeReassignment
                          ? formatRequesterName(item.outOfOfficeReassignment)
                          : "a colleague"}{" "}
                        · {item.currentStep.name}
                      </p>
                    </div>
                    <Button asChild size="sm" type="button">
                      <Link to={`/approvals/${item.id}`}>Review</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

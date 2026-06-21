import { Navigate } from "react-router-dom";

import { useOrganisation } from "@/auth/use-organisation";
import { usePermissions } from "@/auth/use-permissions";
import { MembersTable } from "@/components/members/members-table";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function OrganisationMembersPage() {
  const { currentOrganisation } = useOrganisation();
  const { hasAnyPermission, hasPermission, membershipAccessLoading } =
    usePermissions();

  if (!currentOrganisation) {
    return <Navigate replace to="/organisation/setup" />;
  }

  const canView = hasPermission("members:view");
  const canManage = hasAnyPermission("members:update-role", "members:remove");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">Members</h1>
        <p className="text-muted-foreground">
          View and manage people in {currentOrganisation.name}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organisation members</CardTitle>
          <CardDescription>
            {canManage
              ? "Update roles or remove members from this workspace."
              : canView
                ? "View members in this workspace."
                : "You do not have permission to view organisation members."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {membershipAccessLoading ? (
            <p className="text-sm text-muted-foreground">Loading permissions…</p>
          ) : !canView ? (
            <DismissibleAlert variant="warning">
              Your role does not include access to member management. Contact an
              organisation admin if you need access.
            </DismissibleAlert>
          ) : (
            <MembersTable
              canManage={canManage}
              organisationId={currentOrganisation.id}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

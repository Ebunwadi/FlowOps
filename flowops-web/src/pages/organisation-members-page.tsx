import { Navigate } from "react-router-dom";

import { useOrganisation } from "@/auth/use-organisation";
import { MembersTable } from "@/components/members/members-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { canManageMembers, canViewMembers } from "@/lib/member-permissions";

export function OrganisationMembersPage() {
  const { currentOrganisation } = useOrganisation();

  if (!currentOrganisation) {
    return <Navigate replace to="/organisation/setup" />;
  }

  const canView = canViewMembers(currentOrganisation.role);
  const canManage = canManageMembers(currentOrganisation.role);

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
          {!canView ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Your role does not include access to member management. Contact an
              organisation admin if you need access.
            </div>
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

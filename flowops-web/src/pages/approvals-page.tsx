import { Navigate } from "react-router-dom";

import { useOrganisation } from "@/auth/use-organisation";
import { usePermissions } from "@/auth/use-permissions";
import { PendingApprovalsTable } from "@/components/approvals/pending-approvals-table";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";

export function ApprovalsPage() {
  const { currentOrganisation } = useOrganisation();
  const { hasPermission, membershipAccessLoading } = usePermissions();

  const canViewApprovals = hasPermission("approvals:view");

  if (!currentOrganisation) {
    return <Navigate replace to="/organisation/setup" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
          Pending approvals
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review workflow requests currently waiting for your role.
        </p>
      </div>

      {membershipAccessLoading ? (
        <p className="text-sm text-muted-foreground">Loading permissions…</p>
      ) : !canViewApprovals ? (
        <DismissibleAlert variant="warning">
          Your role does not include permission to view pending approvals. Contact
          an organisation admin if you need access.
        </DismissibleAlert>
      ) : (
        <PendingApprovalsTable />
      )}
    </div>
  );
}

import { Link } from "react-router-dom";

import { usePermissions } from "@/auth/use-permissions";
import { MyRequestsTable } from "@/components/requests/my-requests-table";
import { Button } from "@/components/ui/button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";

export function RequestsPage() {
  const { hasPermission, membershipAccessLoading } = usePermissions();

  const canViewOwn = hasPermission("requests:view-own");
  const canCreate = hasPermission("requests:create");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
            My requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track the requests you have submitted as they move through approvals.
          </p>
        </div>
        {canCreate ? (
          <Button asChild className="shrink-0" type="button">
            <Link to="/requests/start">Start a request</Link>
          </Button>
        ) : null}
      </div>

      {membershipAccessLoading ? (
        <p className="text-sm text-muted-foreground">Loading permissions…</p>
      ) : !canViewOwn ? (
        <DismissibleAlert variant="warning">
          Your role does not include permission to view your requests. Contact an
          organisation admin if you need access.
        </DismissibleAlert>
      ) : (
        <MyRequestsTable />
      )}
    </div>
  );
}

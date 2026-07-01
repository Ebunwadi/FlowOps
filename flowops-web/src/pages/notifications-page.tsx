import { Navigate } from "react-router-dom";

import { useOrganisation } from "@/auth/use-organisation";
import { usePermissions } from "@/auth/use-permissions";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";

export function NotificationsPage() {
  const { currentOrganisation } = useOrganisation();
  const { hasPermission, membershipAccessLoading } = usePermissions();

  const canViewNotifications = hasPermission("notifications:view");
  const canUpdateNotifications = hasPermission("notifications:update");

  if (!currentOrganisation) {
    return <Navigate replace to="/organisation/setup" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stay on top of approvals, request updates, and workflow activity.
        </p>
      </div>

      {membershipAccessLoading ? (
        <p className="text-sm text-muted-foreground">Loading permissions…</p>
      ) : !canViewNotifications ? (
        <DismissibleAlert variant="warning">
          Your role does not include permission to view notifications. Contact an
          organisation admin if you need access.
        </DismissibleAlert>
      ) : (
        <NotificationsList canMarkRead={canUpdateNotifications} />
      )}
    </div>
  );
}

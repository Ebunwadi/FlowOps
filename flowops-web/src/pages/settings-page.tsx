import { Link } from "react-router-dom";

import { NotificationPreferencesPlaceholder } from "@/components/settings/notification-preferences-placeholder";
import { usePermissions } from "@/auth/use-permissions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SettingsPage() {
  const { hasPermission } = usePermissions();
  const canViewOrganisationSettings = hasPermission("settings:view");
  const canManageApiKeys = hasPermission("apikeys:manage");
  const canManageWebhooks = hasPermission("webhooks:manage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, notification preferences, and account settings.
        </p>
      </div>

      {canViewOrganisationSettings ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Organisation</CardTitle>
            <CardDescription>
              Configure AI, webhooks, API access, and approval defaults for this
              workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/settings/organisation">Open organisation settings</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {canManageApiKeys ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">API keys</CardTitle>
            <CardDescription>
              Create and revoke keys for external integrations with this
              organisation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/settings/api-keys">Manage API keys</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {canManageWebhooks ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Webhooks</CardTitle>
            <CardDescription>
              Register outbound endpoints and monitor delivery status for workflow
              events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/settings/webhooks">Manage webhooks</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <NotificationPreferencesPlaceholder />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Account</CardTitle>
          <CardDescription>
            Profile and security settings will be added in a future release.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Account management continues to run through your organisation identity
          provider. Additional FlowOps profile controls are planned for a later
          sprint.
        </CardContent>
      </Card>
    </div>
  );
}

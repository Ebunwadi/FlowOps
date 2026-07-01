import { NotificationPreferencesPlaceholder } from "@/components/settings/notification-preferences-placeholder";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SettingsPage() {
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

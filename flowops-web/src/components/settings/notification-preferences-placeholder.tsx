import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const NOTIFICATION_PREFERENCE_OPTIONS = [
  {
    id: "approval-required",
    label: "Email me when approval is required",
    description: "When a workflow request is waiting for your approval.",
  },
  {
    id: "request-rejected",
    label: "Email me when my request is rejected",
    description: "When an approver rejects one of your requests.",
  },
  {
    id: "request-completed",
    label: "Email me when my request is completed",
    description: "When your request is fully approved.",
  },
  {
    id: "comment-added",
    label: "Email me when someone comments",
    description: "When a comment is added to one of your requests.",
  },
] as const;

export function NotificationPreferencesPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="text-xl">Notification preferences</CardTitle>
            <CardDescription>
              Choose which workflow events should send you email. Preferences are
              not saved yet — this section previews upcoming controls.
            </CardDescription>
          </div>
          <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Coming soon
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <ul className="divide-y rounded-lg border">
          {NOTIFICATION_PREFERENCE_OPTIONS.map((option) => (
            <li key={option.id}>
              <label
                className={cn(
                  "flex cursor-not-allowed items-start gap-3 px-4 py-4",
                  "opacity-70",
                )}
                htmlFor={`notification-pref-${option.id}`}
              >
                <input
                  checked
                  className="mt-1 h-4 w-4 rounded border-input"
                  disabled
                  id={`notification-pref-${option.id}`}
                  type="checkbox"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="pt-3 text-xs text-muted-foreground">
          In-app notifications are already active. Email delivery follows these
          preferences once saving is implemented in a later sprint.
        </p>
      </CardContent>
    </Card>
  );
}

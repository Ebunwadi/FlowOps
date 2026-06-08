import { useAuth } from "@/auth/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatProfileName } from "@/types/user";

export function DashboardPage() {
  const { user, profile, profileLoading } = useAuth();

  const displayName = profile
    ? formatProfileName(profile)
    : (user?.name ?? user?.username ?? "there");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of active workflows, pending approvals, and team activity.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {profileLoading && !profile
              ? "Loading your profile..."
              : `Welcome, ${displayName}`}
          </CardTitle>
          <CardDescription>
            Your synced FlowOps profile from the backend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Username</dt>
                <dd className="font-medium">{profile.username}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Roles</dt>
                <dd className="font-medium">
                  {profile.roles.length > 0 ? profile.roles.join(", ") : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">FlowOps user ID</dt>
                <dd className="font-medium">{profile.id}</dd>
              </div>
            </dl>
          ) : profileLoading ? (
            <p className="text-sm text-muted-foreground">Fetching profile...</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sign in and ensure the API is running to load your local profile.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

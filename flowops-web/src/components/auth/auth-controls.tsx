import { useAuth } from "@/auth/use-auth";
import { Button } from "@/components/ui/button";
import { formatProfileName } from "@/types/user";

export function AuthControls() {
  const { initialized, isAuthenticated, user, profile, profileLoading, login, logout } =
    useAuth();

  if (!initialized) {
    return (
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Checking session...
      </p>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Button
        onClick={() => {
          void login();
        }}
        type="button"
      >
        Sign in
      </Button>
    );
  }

  const displayName = profile
    ? formatProfileName(profile)
    : (user.name ?? user.username);
  const displayEmail = profile?.email ?? user.email ?? user.username;

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium">
          {profileLoading && !profile ? "Loading profile..." : displayName}
        </p>
        <p className="text-xs text-muted-foreground">{displayEmail}</p>
      </div>
      <Button
        onClick={() => {
          void logout();
        }}
        type="button"
        variant="outline"
      >
        Sign out
      </Button>
    </div>
  );
}

import { useAuth } from "@/auth/use-auth";
import { Button } from "@/components/ui/button";

export function AuthControls() {
  const { initialized, isAuthenticated, user, login, logout } = useAuth();

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

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium">{user.name ?? user.username}</p>
        <p className="text-xs text-muted-foreground">{user.email ?? user.username}</p>
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

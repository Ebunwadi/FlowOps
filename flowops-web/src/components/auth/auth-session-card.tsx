import { useAuth } from "@/auth/use-auth";
import { Button } from "@/components/ui/button";
import { clientLogger } from "@/lib/logger";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AuthSessionCard() {
  const { initialized, isAuthenticated, user, login, logout, getAccessToken } =
    useAuth();

  if (!initialized) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authentication</CardTitle>
        <CardDescription>
          Keycloak session status for the current browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAuthenticated || !user ? (
          <>
            <p className="text-sm text-muted-foreground">
              You are not signed in. Use the button below or the header action
              to authenticate with Keycloak.
            </p>
            <Button
              onClick={() => {
                void login();
              }}
              type="button"
            >
              Sign in with Keycloak
            </Button>
          </>
        ) : (
          <>
            <dl className="grid gap-3 rounded-md border p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{user.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Username</dt>
                <dd className="font-medium">{user.username}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{user.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Roles</dt>
                <dd className="font-medium">
                  {user.roles.length > 0 ? user.roles.join(", ") : "—"}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={async () => {
                  const token = await getAccessToken();
                  if (token) {
                    clientLogger.info({
                      area: "auth",
                      event: "token.verified",
                      message: "Access token retrieved successfully",
                      context: { tokenLength: token.length },
                    });
                  }
                }}
                type="button"
                variant="outline"
              >
                Verify access token
              </Button>
              {import.meta.env.DEV ? (
                <Button
                  onClick={async () => {
                    const token = await getAccessToken();
                    if (!token) {
                      return;
                    }

                    await navigator.clipboard.writeText(token);
                    clientLogger.info({
                      area: "auth",
                      event: "token.copied",
                      message: "Access token copied for API testing (Swagger)",
                      context: { tokenLength: token.length },
                    });
                  }}
                  type="button"
                  variant="outline"
                >
                  Copy token for Swagger
                </Button>
              ) : null}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}

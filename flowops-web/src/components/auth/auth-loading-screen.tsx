interface AuthLoadingScreenProps {
  message?: string;
}

/** Shown while Keycloak checks the session or before a login redirect. */
export function AuthLoadingScreen({
  message = "Checking your session...",
}: AuthLoadingScreenProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6">
      <div className="space-y-3 text-center">
        <div
          aria-hidden="true"
          className="mx-auto size-8 animate-spin rounded-full border-2 border-muted border-t-primary"
        />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

interface AuthErrorScreenProps {
  message: string;
  onRetry: () => void;
}

export function AuthErrorScreen({ message, onRetry }: AuthErrorScreenProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6">
      <div className="max-w-md space-y-4 rounded-lg border p-6 text-center">
        <h1 className="text-lg font-semibold">Authentication unavailable</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <p className="text-sm text-muted-foreground">
          Ensure Keycloak is running at the URL configured in{" "}
          <code className="rounded bg-muted px-1 py-0.5">VITE_KEYCLOAK_URL</code>.
        </p>
        <button
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          onClick={onRetry}
          type="button"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

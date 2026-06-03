import { useQuery } from "@tanstack/react-query";

import { getHealthStatus } from "@/api/health";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function HomePage() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: getHealthStatus,
  });

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to FlowOps</h1>
        <p className="max-w-2xl text-muted-foreground">
          The frontend foundation is ready with React, TypeScript, React Router,
          TanStack Query, Tailwind CSS, and shadcn-style UI components.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon />
            API Health Check
          </CardTitle>
          <CardDescription>
            Confirms the frontend can reach the FlowOps backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void healthQuery.refetch();
            }}
            disabled={healthQuery.isFetching}
          >
            {healthQuery.isFetching ? "Checking..." : "Check API Health"}
          </Button>

          {healthQuery.isError ? (
            <p className="text-sm text-red-600">
              Unable to reach the API. Start the backend with{" "}
              <code className="rounded bg-muted px-1 py-0.5">npm run dev</code> in{" "}
              <code className="rounded bg-muted px-1 py-0.5">flowops-api</code>.
            </p>
          ) : null}

          {healthQuery.data ? (
            <dl className="grid gap-3 rounded-md border p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Service</dt>
                <dd className="flex items-center gap-2 font-medium">
                  <ServerIcon />
                  {healthQuery.data.service}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">{healthQuery.data.status}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Environment</dt>
                <dd className="font-medium">{healthQuery.data.environment}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Uptime</dt>
                <dd className="font-medium">{healthQuery.data.uptimeSeconds}s</dd>
              </div>
            </dl>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect height="7" rx="1" width="20" x="2" y="3" />
      <rect height="7" rx="1" width="20" x="2" y="14" />
      <path d="M6 6h.01M6 17h.01" strokeLinecap="round" />
    </svg>
  );
}

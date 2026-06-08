import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

/** Shared shell for protected pages until feature modules are implemented. */
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="max-w-2xl text-muted-foreground">{description}</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            This area is protected and ready for Sprint 2+ feature work.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You reached this page because your Keycloak session is active. Workflow
          and request management features will be added in upcoming sprints.
        </CardContent>
      </Card>
    </div>
  );
}

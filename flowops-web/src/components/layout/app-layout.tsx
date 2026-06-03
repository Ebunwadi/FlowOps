import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
          <div>
            <p className="text-lg font-semibold">FlowOps</p>
            <p className="text-sm text-muted-foreground">
              Enterprise workflow automation platform
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

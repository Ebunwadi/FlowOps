import { Outlet } from "react-router-dom";

import { AuthControls } from "@/components/auth/auth-controls";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <div>
            <p className="text-lg font-semibold">FlowOps</p>
            <p className="text-sm text-muted-foreground">
              Enterprise workflow automation platform
            </p>
          </div>
          <AuthControls />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

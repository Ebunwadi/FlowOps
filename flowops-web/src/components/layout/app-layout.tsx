import { Link, Outlet } from "react-router-dom";

import { AuthControls } from "@/components/auth/auth-controls";
import { AppNav } from "@/components/layout/app-nav";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link className="block" to="/">
              <p className="text-lg font-semibold">FlowOps</p>
              <p className="text-sm text-muted-foreground">
                Enterprise workflow automation platform
              </p>
            </Link>
            <AuthControls />
          </div>
          <AppNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

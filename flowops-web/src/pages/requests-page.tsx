import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { usePermissions } from "@/auth/use-permissions";
import { RequestsTable, type RequestsScope } from "@/components/requests/requests-table";
import { Button } from "@/components/ui/button";
import { DismissibleAlert } from "@/components/ui/dismissible-alert";
import { cn } from "@/lib/utils";

interface RequestsTab {
  scope: RequestsScope;
  label: string;
}

export function RequestsPage() {
  const { hasPermission, membershipAccessLoading } = usePermissions();

  const canViewOwn = hasPermission("requests:view-own");
  const canViewAll = hasPermission("requests:view-all");
  const canCreate = hasPermission("requests:create");

  const tabs = useMemo<RequestsTab[]>(() => {
    const available: RequestsTab[] = [];
    if (canViewOwn) {
      available.push({ scope: "mine", label: "My requests" });
    }
    if (canViewAll) {
      available.push({ scope: "all", label: "All requests" });
    }
    return available;
  }, [canViewOwn, canViewAll]);

  const [activeScope, setActiveScope] = useState<RequestsScope>("mine");

  const effectiveScope =
    tabs.find((tab) => tab.scope === activeScope)?.scope ?? tabs[0]?.scope;

  const isAllScope = effectiveScope === "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
            Requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAllScope
              ? "Track every request submitted across your organisation."
              : "Track the requests you have submitted as they move through approvals."}
          </p>
        </div>
        {canCreate ? (
          <Button asChild className="shrink-0" type="button">
            <Link to="/requests/start">Start a request</Link>
          </Button>
        ) : null}
      </div>

      {membershipAccessLoading ? (
        <p className="text-sm text-muted-foreground">Loading permissions…</p>
      ) : tabs.length === 0 ? (
        <DismissibleAlert variant="warning">
          Your role does not include permission to view requests. Contact an
          organisation admin if you need access.
        </DismissibleAlert>
      ) : (
        <>
          {tabs.length > 1 ? (
            <div className="border-b">
              <nav className="-mb-px flex gap-6">
                {tabs.map((tab) => {
                  const isActive = tab.scope === effectiveScope;
                  return (
                    <button
                      key={tab.scope}
                      className={cn(
                        "border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
                        isActive
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => {
                        setActiveScope(tab.scope);
                      }}
                      type="button"
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          ) : null}

          {effectiveScope ? <RequestsTable scope={effectiveScope} /> : null}
        </>
      )}
    </div>
  );
}

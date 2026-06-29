import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const variantStyles = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
} as const;

export const DEFAULT_ALERT_AUTO_DISMISS_MS = 30_000;

interface DismissibleAlertProps {
  children: ReactNode;
  variant?: keyof typeof variantStyles;
  defaultOpen?: boolean;
  messageKey?: string;
  className?: string;
  autoDismissMs?: number;
  onDismiss?: () => void;
}

export function DismissibleAlert({
  children,
  variant = "success",
  defaultOpen = true,
  messageKey = "__static__",
  className,
  autoDismissMs = DEFAULT_ALERT_AUTO_DISMISS_MS,
  onDismiss,
}: DismissibleAlertProps) {
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() => new Set());

  const open = defaultOpen && !dismissedKeys.has(messageKey);

  const handleDismiss = () => {
    setDismissedKeys((current) => new Set(current).add(messageKey));
    onDismiss?.();
  };

  useEffect(() => {
    if (!open || autoDismissMs <= 0) {
      return;
    }

    const timer = window.setTimeout(handleDismiss, autoDismissMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open, autoDismissMs, messageKey]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm",
        variantStyles[variant],
        className,
      )}
      role={variant === "success" ? "status" : "alert"}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <button
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:bg-black/5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={handleDismiss}
        type="button"
      >
        <span aria-hidden className="block text-base leading-none">
          ×
        </span>
      </button>
    </div>
  );
}

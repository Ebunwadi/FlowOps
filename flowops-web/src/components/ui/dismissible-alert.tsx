import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const variantStyles = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
} as const;

interface DismissibleAlertProps {
  children: ReactNode;
  variant?: keyof typeof variantStyles;
  defaultOpen?: boolean;
  messageKey?: string;
  className?: string;
  onDismiss?: () => void;
}

export function DismissibleAlert({
  children,
  variant = "success",
  defaultOpen = true,
  messageKey = "__static__",
  className,
  onDismiss,
}: DismissibleAlertProps) {
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() => new Set());

  const open = defaultOpen && !dismissedKeys.has(messageKey);

  if (!open) {
    return null;
  }

  const handleDismiss = () => {
    setDismissedKeys((current) => new Set(current).add(messageKey));
    onDismiss?.();
  };

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

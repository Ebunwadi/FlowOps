import { cn } from "@/lib/utils";

export interface SimpleBarChartProps {
  items: Array<{ label: string; value: number }>;
  emptyMessage?: string;
  valueFormatter?: (value: number) => string;
}

export function SimpleBarChart({
  items,
  emptyMessage = "No data for the selected filters.",
  valueFormatter = (value) => String(value),
}: SimpleBarChartProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const widthPercent = Math.max((item.value / maxValue) * 100, item.value > 0 ? 4 : 0);

        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-foreground">{item.label}</span>
              <span className="shrink-0 font-medium text-muted-foreground">
                {valueFormatter(item.value)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className={cn("h-2 rounded-full bg-primary transition-all")}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

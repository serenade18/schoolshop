import { cn } from "@/lib/utils"

/** Progress bar in the brand gradient. `value` is 0–1. */
export function GradientBar({ value, className, label }: { value: number; className?: string; label?: string }) {
  const pct = Math.round(Math.min(Math.max(value, 0), 1) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn("h-1.5 overflow-hidden rounded-full bg-secondary", className)}
    >
      <div className="h-full rounded-full bg-linear-to-r from-sun to-flame" style={{ width: `${pct}%` }} />
    </div>
  )
}

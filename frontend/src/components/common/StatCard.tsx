import type { ReactNode } from "react"

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border bg-card p-4.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-display text-[28px] leading-tight font-semibold">{value}</span>
      {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
    </div>
  )
}

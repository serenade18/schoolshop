import { Link } from "react-router"
import { ChevronRight } from "lucide-react"

import { PageHeader } from "@/components/common/PageHeader"
import { QueryBoundary } from "@/components/common/QueryBoundary"
import { StatCard } from "@/components/common/StatCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminOverview } from "@/lib/api/queries"
import { formatKes } from "@/lib/format"
import { cn } from "@/lib/utils"

const dot = { high: "bg-flame", medium: "bg-sun", info: "bg-info-fg" } as const

export function AdminOverviewPage() {
  const overview = useAdminOverview()
  return (
    <QueryBoundary query={overview}>
      {(o) => (
        <>
          <PageHeader eyebrow={`${o.termName} · all schools`} title="Platform overview" />
          <section aria-label="Key numbers" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            <StatCard label="Sales this term" value={formatKes(o.salesCents)} hint={`${o.paidOrders.toLocaleString("en-KE")} paid orders`} />
            <StatCard label="Funds held" value={formatKes(o.heldCents)} hint="Released on delivery" />
            <StatCard label="M-Pesa success, 24h" value={`${(o.mpesaSuccessRate * 100).toFixed(1)}%`} />
            <StatCard label="Live organisations" value={`${o.liveSchools} · ${o.livePublishers}`} hint="Schools · publishers" />
          </section>
          <Card className="max-w-3xl">
            <CardHeader><CardTitle>Needs attention</CardTitle></CardHeader>
            <CardContent>
              <ul>
                {o.alerts.map((a) => (
                  <li key={a.id}>
                    <Link to={a.href} className="flex items-center gap-3 border-b border-secondary py-3">
                      <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", dot[a.severity])} />
                      <span className="flex grow flex-col">
                        <span className="text-[15px] font-semibold">{a.title}</span>
                        <span className="text-[13px] text-muted-foreground">{a.detail}</span>
                      </span>
                      <ChevronRight className="size-4.5 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </QueryBoundary>
  )
}

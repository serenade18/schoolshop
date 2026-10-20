import { Link } from "react-router"

import { GradientBar } from "@/components/common/GradientBar"
import { PageHeader } from "@/components/common/PageHeader"
import { QueryBoundary } from "@/components/common/QueryBoundary"
import { StatCard } from "@/components/common/StatCard"
import { ShipmentStatusBadge } from "@/components/common/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useSchoolOverview } from "@/lib/api/queries"
import { formatDay, formatKes } from "@/lib/format"

const listStatus = { published: ["Published", "info"], draft: ["Draft", "secondary"], closed: ["Closed", "secondary"] } as const

export function SchoolOverviewPage() {
  const overview = useSchoolOverview()
  return (
    <QueryBoundary query={overview}>
      {(o) => {
        const nextDelivery = o.deliveries.find((d) => d.status === "dispatched")
        return (
          <>
            <PageHeader
              eyebrow={o.termName}
              title="Overview"
              actions={
                <>
                  <Button variant="outline">Share list link with parents</Button>
                  <Button asChild>
                    <Link to="/school/booklists?new">New booklist</Link>
                  </Button>
                </>
              }
            />
            <section aria-label="Key numbers" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
              <StatCard
                label="Students with an order"
                value={<>{o.studentsOrdered} <span className="text-base font-medium text-muted-foreground">of {o.studentsTotal}</span></>}
                hint={<GradientBar value={o.studentsOrdered / o.studentsTotal} label="Students with an order" />}
              />
              <StatCard label="Order deadline" value={formatDay(o.orderDeadline)} hint="Reminder SMS goes out 3 days before" />
              <StatCard
                label="Deliveries received"
                value={<>{o.deliveriesReceived} <span className="text-base font-medium text-muted-foreground">of {o.deliveriesExpected} publishers</span></>}
                hint={nextDelivery?.date ? `Next: ${nextDelivery.publisherName}, ${formatDay(nextDelivery.date)}` : undefined}
              />
              <StatCard
                label="Packs collected"
                value={<>{o.packsCollected} <span className="text-base font-medium text-muted-foreground">of {o.studentsOrdered}</span></>}
                hint="Handed out class by class with each parent's code"
              />
            </section>
            <div className="flex flex-wrap items-start gap-5">
              <Card className="min-w-0 grow-[3] basis-[520px]">
                <CardHeader><CardTitle>Booklists by grade</CardTitle></CardHeader>
                <CardContent>
                  <Table className="min-w-[520px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Grade</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Required pack</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ordered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {o.booklists.map((b) => {
                        const [label, variant] = listStatus[b.status]
                        return (
                          <TableRow key={b.id}>
                            <TableCell className="font-semibold">{b.gradeName}</TableCell>
                            <TableCell>{b.itemCount}</TableCell>
                            <TableCell>{formatKes(b.requiredTotalCents)}</TableCell>
                            <TableCell><Badge variant={variant}>{label}</Badge></TableCell>
                            <TableCell>{b.ordered} / {b.students}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card className="min-w-0 grow-[2] basis-[300px]">
                <CardHeader><CardTitle>Incoming deliveries</CardTitle></CardHeader>
                <CardContent>
                  <ul>
                    {o.deliveries.map((d) => (
                      <li key={d.id} className="flex items-center gap-3 border-b border-secondary py-3 last:border-0">
                        <span className="flex grow flex-col">
                          <span className="text-[15px] font-semibold">{d.publisherName}</span>
                          <span className="text-[13px] text-muted-foreground">
                            {d.packs} packs{d.date && ` · ${d.status === "received" ? "delivered" : "arriving"} ${formatDay(d.date)}`}
                          </span>
                        </span>
                        {d.status === "dispatched" ? (
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/school/deliveries/${d.id}`}>Receive</Link>
                          </Button>
                        ) : (
                          <ShipmentStatusBadge status={d.status} />
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </>
        )
      }}
    </QueryBoundary>
  )
}

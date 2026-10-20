import { useState } from "react"
import { Link } from "react-router"

import { PageHeader } from "@/components/common/PageHeader"
import { QueryBoundary } from "@/components/common/QueryBoundary"
import { StatCard } from "@/components/common/StatCard"
import { ShipmentStatusBadge } from "@/components/common/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePublisherBatches } from "@/lib/api/queries"
import type { SchoolBatch } from "@/lib/api/schemas"
import { formatDay, formatKes } from "@/lib/format"

export function PublisherOrdersPage() {
  const batches = usePublisherBatches()
  return (
    <>
      <PageHeader eyebrow="Orders are grouped per school and released at the school's deadline" title="School orders" />
      <QueryBoundary query={batches}>{(data) => <Batches batches={data} />}</QueryBoundary>
    </>
  )
}

const schools = (n: number) => `${n} ${n === 1 ? "school" : "schools"}`

function Batches({ batches }: { batches: SchoolBatch[] }) {
  const [selectedId, setSelectedId] = useState(batches[0]?.id)
  const selected = batches.find((b) => b.id === selectedId)
  const ready = batches.filter((b) => b.status === "ready_to_pack")
  const collecting = batches.filter((b) => b.status === "collecting")
  const pending = batches.filter((b) => b.status === "dispatched").reduce((s, b) => s + b.valueCents, 0)

  return (
    <>
      <section aria-label="Key numbers" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <StatCard label="Ready to pack" value={schools(ready.length)} />
        <StatCard label="Still collecting orders" value={schools(collecting.length)} />
        <StatCard label="Payout pending receipt" value={formatKes(pending)} />
      </section>
      <div className="flex flex-wrap items-start gap-5">
        <Card className="min-w-0 grow-[3] basis-[520px]">
          <CardHeader><CardTitle>By school</CardTitle></CardHeader>
          <CardContent>
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Packs</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Due at school</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((b) => (
                  <TableRow key={b.id} data-state={b.id === selectedId ? "selected" : undefined}>
                    <TableCell>
                      <button type="button" onClick={() => setSelectedId(b.id)} className="flex min-h-11 flex-col items-start justify-center text-left">
                        <span className="font-semibold">{b.schoolName}</span>
                        <span className="text-[13px] text-muted-foreground">{b.town}</span>
                      </button>
                    </TableCell>
                    <TableCell>{b.packs}</TableCell>
                    <TableCell>{formatKes(b.valueCents)}</TableCell>
                    <TableCell>{formatDay(b.dueAtSchool)}</TableCell>
                    <TableCell><ShipmentStatusBadge status={b.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {selected && (
          <Card className="min-w-0 grow-[2] basis-[320px]">
            <CardHeader>
              <span className="text-[13px] text-muted-foreground">Pick list</span>
              <CardTitle>{selected.schoolName}</CardTitle>
              <span className="text-sm text-muted-foreground">{selected.packs} packs · labelled per student and class</span>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ul>
                {selected.lines.map((l) => (
                  <li key={l.title} className="flex justify-between gap-3 border-b border-secondary py-2.5 text-[15px] last:border-0">
                    <span>{l.title}</span>
                    <span className="font-bold">× {l.qty}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2.5">
                <Button variant="outline">Download labels</Button>
                {selected.status === "ready_to_pack" ? (
                  <Button asChild>
                    <Link to={`/publisher/dispatches?batch=${selected.id}`}>Dispatch</Link>
                  </Button>
                ) : (
                  <Button disabled>Dispatch</Button>
                )}
              </div>
              <p className="text-[13px] text-muted-foreground">Payout is released when the school confirms the delivery.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

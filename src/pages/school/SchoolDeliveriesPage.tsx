import type { ReactNode } from "react"
import { Link } from "react-router"
import { AlertTriangle, CalendarClock, PackageOpen, Phone, Truck } from "lucide-react"

import { PageHeader } from "@/components/common/PageHeader"
import { QueryBoundary } from "@/components/common/QueryBoundary"
import { StatCard } from "@/components/common/StatCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSchoolDeliveries } from "@/lib/api/queries"
import type { SchoolDelivery } from "@/lib/api/schemas"
import { formatDay } from "@/lib/format"

/** 254711222333 → "0711 222 333" */
const localPhone = (e164: string) => e164.replace(/^254(\d{3})(\d{3})(\d{3})$/, "0$1 $2 $3")
const dayTime = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
const issueLabel = { damaged: "Damaged packs", wrong_items: "Wrong items" } as const

export function SchoolDeliveriesPage() {
  const deliveries = useSchoolDeliveries()
  return (
    <>
      <PageHeader eyebrow="One delivery from each publisher. Count the packs before you confirm." title="Deliveries" />
      <QueryBoundary query={deliveries}>{(data) => <Deliveries deliveries={data} />}</QueryBoundary>
    </>
  )
}

function Deliveries({ deliveries }: { deliveries: SchoolDelivery[] }) {
  const onTheWay = deliveries.filter((d) => d.status === "dispatched").sort((a, b) => (a.expectedAt ?? "").localeCompare(b.expectedAt ?? ""))
  const packing = deliveries.filter((d) => d.status === "ready_to_pack" || d.status === "collecting")
  const received = deliveries.filter((d) => d.status === "received")
  const atSchool = received.reduce((t, d) => t + (d.receipt?.packsReceived ?? 0), 0)
  const expected = deliveries.reduce((t, d) => t + d.packs, 0)
  const withIssue = received.filter((d) => d.receipt && (d.receipt.issues.length > 0 || d.receipt.packsReceived < d.packs))
  const next = onTheWay[0]

  return (
    <>
      <section aria-label="Key numbers" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <StatCard
          label="Deliveries received"
          value={<>{received.length} <span className="text-base font-medium text-muted-foreground">of {deliveries.length} publishers</span></>}
          hint="Collection opens when all arrive"
        />
        <StatCard label="Next arrival" value={next?.expectedAt ? formatDay(next.expectedAt) : "—"} hint={next ? `${next.publisherName}, ${next.packs} packs` : "Nothing on the road"} />
        <StatCard label="Packs at school" value={<>{atSchool} <span className="text-base font-medium text-muted-foreground">of {expected}</span></>} hint="One pack per student per publisher" />
        <StatCard label="Problems reported" value={withIssue.length} hint={withIssue.length ? `${withIssue.map((d) => d.publisherName).join(", ")} fixing it` : "None so far"} />
      </section>

      <Section title="On the way" count={onTheWay.length} empty="Nothing on the road right now. You'll get an SMS when a publisher dispatches.">
        {onTheWay.map((d) => <OnTheWayCard key={d.id} delivery={d} />)}
      </Section>
      <Section title="Being packed" count={packing.length} empty="Every publisher has dispatched.">
        {packing.map((d) => (
          <article key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 md:p-5">
            <Title delivery={d} />
            <span className="text-sm text-muted-foreground">Packing now. We'll SMS you the delivery date.</span>
          </article>
        ))}
      </Section>
      <Section title="Received" count={received.length} empty="Nothing received yet.">
        {received.map((d) => <ReceivedCard key={d.id} delivery={d} />)}
      </Section>
    </>
  )
}

function Section({ title, count, empty, children }: { title: string; count: number; empty: string; children: ReactNode }) {
  const id = `sec-${title.toLowerCase().replace(/\s+/g, "-")}`
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="flex items-center gap-2 font-display text-xl font-semibold">
        {title} <span className="rounded-full bg-secondary px-2 text-sm font-semibold">{count}</span>
      </h2>
      {count === 0 ? <p className="rounded-2xl border border-dashed bg-card px-5 py-8 text-center text-muted-foreground">{empty}</p> : children}
    </section>
  )
}

function Title({ delivery, children }: { delivery: SchoolDelivery; children?: ReactNode }) {
  const grades = [...new Set(delivery.classes.map((c) => c.className.replace(/\s\S+$/, "")))]
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col">
        <span className="text-[17px] font-semibold">{delivery.publisherName}</span>
        <span className="text-sm text-muted-foreground">
          {delivery.packs} packs · {delivery.classes.length} classes{grades.length > 0 && ` (${grades.map((g) => (/^\d/.test(g) ? `Grade ${g}` : g)).join(", ")})`}
        </span>
      </div>
      {children}
    </div>
  )
}

function OnTheWayCard({ delivery }: { delivery: SchoolDelivery }) {
  const d = delivery.dispatch
  return (
    <article className="flex flex-col gap-4 rounded-2xl border bg-card p-4 md:p-5">
      <Title delivery={delivery}>
        {delivery.expectedAt && (
          <span className="flex items-center gap-1.5 rounded-full bg-info-bg px-3 py-1 text-xs font-bold text-info-fg">
            <CalendarClock className="size-3.5" aria-hidden /> Arriving {formatDay(delivery.expectedAt)}
          </span>
        )}
      </Title>
      {d && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm lg:grid-cols-4">
          <Fact label="Delivery note" value={d.deliveryNoteNo} />
          <Fact label="Carrier" value={`${d.carrier} · ${d.vehicleReg}`} />
          <Fact
            label="Driver"
            value={
              <a href={`tel:+${d.driverPhone}`} className="inline-flex items-center gap-1 font-semibold text-accent-text hover:underline">
                <Phone className="size-3.5" aria-hidden />
                {d.driverName}, {localPhone(d.driverPhone)}
              </a>
            }
          />
          <Fact label="Cartons" value={String(d.cartons)} />
        </dl>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link to={`/school/deliveries/${delivery.id}`}>
            <PackageOpen aria-hidden /> Receive delivery
          </Link>
        </Button>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Truck className="size-4" aria-hidden /> Dispatched {d ? dayTime.format(new Date(d.dispatchedAt)) : ""}
        </span>
      </div>
    </article>
  )
}

function ReceivedCard({ delivery }: { delivery: SchoolDelivery }) {
  const r = delivery.receipt
  const short = r ? delivery.packs - r.packsReceived : 0
  const problem = !!r && (r.issues.length > 0 || short > 0)
  return (
    <article className="flex flex-col gap-4 rounded-2xl border bg-card p-4 md:p-5">
      <Title delivery={delivery}>{problem ? <Badge variant="warning">Problem reported</Badge> : <Badge variant="success">All received</Badge>}</Title>
      {r && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm lg:grid-cols-4">
          <Fact label="Received" value={dayTime.format(new Date(r.receivedAt))} />
          <Fact label="Counted by" value={r.receivedBy} />
          <Fact label="Packs" value={`${r.packsReceived} of ${delivery.packs}`} />
          <Fact label="Driver sign-off code" value={<span className="font-mono">{r.signOffCode}</span>} />
        </dl>
      )}
      {problem && r && (
        <p className="flex items-start gap-2.5 rounded-xl bg-warn-bg p-3.5 text-sm text-warn-fg">
          <AlertTriangle className="mt-0.5 size-4.5 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">
              {[short > 0 && `${short} pack${short === 1 ? "" : "s"} short`, ...r.issues.map((i) => issueLabel[i])].filter(Boolean).join(" · ")}.{" "}
            </span>
            {r.notes} {delivery.publisherName} sends replacements; parents of the affected students are kept informed.
          </span>
        </p>
      )}
    </article>
  )
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold break-words">{value}</dd>
    </div>
  )
}

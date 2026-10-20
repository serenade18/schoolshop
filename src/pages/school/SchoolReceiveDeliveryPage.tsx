import { useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react"

import { QueryBoundary } from "@/components/common/QueryBoundary"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api/client"
import { useReceiveDelivery, useSchoolDelivery } from "@/lib/api/queries"
import type { SchoolDelivery } from "@/lib/api/schemas"
import { formatDay } from "@/lib/format"
import { cn } from "@/lib/utils"

type Issue = "damaged" | "wrong_items"

const issues: { id: Issue; label: string }[] = [
  { id: "damaged", label: "Some packs are damaged" },
  { id: "wrong_items", label: "Wrong items inside a pack" },
]

export function SchoolReceiveDeliveryPage() {
  const { id = "" } = useParams()
  const delivery = useSchoolDelivery(id)
  return <QueryBoundary query={delivery}>{(d) => <Receive key={d.id} delivery={d} />}</QueryBoundary>
}

function Receive({ delivery }: { delivery: SchoolDelivery }) {
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [flags, setFlags] = useState<Issue[]>([])
  const [notes, setNotes] = useState("")
  const [errors, setErrors] = useState<{ classes?: string; notes?: string; root?: string }>({})
  const receive = useReceiveDelivery()

  if (delivery.status === "received") return <Received delivery={delivery} />

  const d = delivery.dispatch
  const parsed = delivery.classes.map((c) => {
    const raw = counts[c.className] ?? ""
    return { ...c, raw, n: /^\d+$/.test(raw) ? Number(raw) : null }
  })
  const allCounted = parsed.every((c) => c.n !== null)
  const total = parsed.reduce((t, c) => t + (c.n ?? 0), 0)
  const shortClasses = parsed.filter((c) => c.n !== null && c.n < c.expected)
  const missing = shortClasses.reduce((t, c) => t + c.expected - c.n!, 0)
  const over = parsed.find((c) => c.n !== null && c.n > c.expected)
  const needsNotes = flags.length > 0 || missing > 0
  const canReceive = delivery.status === "dispatched"

  const submit = () => {
    if (!allCounted) return setErrors({ classes: "Enter a count for every class, even if it's 0." })
    if (over) return setErrors({ classes: `${over.className} has more packs than were sent. Check the labels: a pack may belong to another class.` })
    if (needsNotes && !notes.trim()) return setErrors({ notes: `Tell ${delivery.publisherName} what's wrong so they can fix it.` })
    setErrors({})
    receive.mutate(
      { id: delivery.id, input: { classes: parsed.map((c) => ({ className: c.className, received: c.n! })), issues: flags, notes: notes.trim() } },
      {
        onError: (e) => {
          const f = e instanceof ApiError ? e.fieldErrors : {}
          setErrors({ classes: f.classes?.[0], notes: f.notes?.[0], root: f.classes || f.notes ? undefined : e.message })
        },
      }
    )
  }

  return (
    <>
      <Header delivery={delivery} />
      {!canReceive && (
        <p className="rounded-2xl bg-warn-bg p-4 text-[15px] text-warn-fg">
          {delivery.publisherName} hasn't dispatched this delivery yet. You can count and confirm it once it's on its way.
        </p>
      )}
      <div className="flex flex-wrap items-start gap-5">
        <section aria-labelledby="count-h" className="flex min-w-0 grow-[3] basis-[520px] flex-col gap-5 rounded-2xl border bg-card p-4 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="count-h" className="font-display text-xl font-semibold">1. Count the packs</h2>
              <p className="text-sm text-muted-foreground">Each pack is labelled with the student's name and class. Enter how many you received.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!canReceive}
              onClick={() => setCounts(Object.fromEntries(delivery.classes.map((c) => [c.className, String(c.expected)])))}
            >
              Everything arrived
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="w-32">Received</TableHead>
                <TableHead>Check</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsed.map((c) => (
                <TableRow key={c.className}>
                  <TableCell className="font-semibold">{c.className}</TableCell>
                  <TableCell className="text-right">{c.expected}</TableCell>
                  <TableCell>
                    <Input
                      inputMode="numeric"
                      value={c.raw}
                      disabled={!canReceive}
                      onChange={(e) => setCounts((prev) => ({ ...prev, [c.className]: e.target.value.replace(/\D/g, "") }))}
                      aria-label={`Packs received for ${c.className}`}
                      className="h-11 w-24"
                    />
                  </TableCell>
                  <TableCell><Check expected={c.expected} n={c.n} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {errors.classes && <p role="alert" className="text-sm text-destructive">{errors.classes}</p>}

          <div className="flex flex-col gap-1">
            <h2 className="font-display text-xl font-semibold">2. Anything wrong?</h2>
            <p className="text-sm text-muted-foreground">
              Short or damaged packs open a claim with {delivery.publisherName}. The parents of those students are kept informed.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {issues.map((i) => (
              <Label key={i.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] font-medium">
                <Checkbox
                  checked={flags.includes(i.id)}
                  disabled={!canReceive}
                  onCheckedChange={(on) => setFlags((prev) => (on ? [...prev, i.id] : prev.filter((x) => x !== i.id)))}
                />
                {i.label}
              </Label>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes for {delivery.publisherName}{needsNotes ? "" : " (optional)"}</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              disabled={!canReceive}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={missing > 0 ? `${missing} packs missing for ${shortClasses.map((c) => c.className).join(", ")}.` : "Which packs, and what's wrong with them"}
              aria-invalid={!!errors.notes}
            />
            {errors.notes && <p role="alert" className="text-sm text-destructive">{errors.notes}</p>}
          </div>
        </section>

        <aside aria-label="Confirm" className="flex min-w-0 grow basis-[300px] flex-col gap-4">
          {d && (
            <section aria-labelledby="note-h" className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
              <h2 id="note-h" className="font-semibold">Delivery note</h2>
              <dl className="flex flex-col gap-2 text-[15px]">
                <Row label="Note no." value={<span className="font-mono">{d.deliveryNoteNo}</span>} />
                <Row label="Driver" value={d.driverName} />
                <Row label="Vehicle" value={d.vehicleReg} />
                <Row label="Cartons" value={String(d.cartons)} />
                <Row label="Packs on note" value={String(delivery.packs)} />
              </dl>
            </section>
          )}
          <section className="flex flex-col gap-3 rounded-2xl bg-ink p-5 text-white">
            <span className="text-sm text-line-strong">Received</span>
            <span className="font-display text-[34px] leading-tight font-semibold">
              {total} <span className="text-lg font-medium text-line-strong">of {delivery.packs}</span>
            </span>
            {missing > 0 && (
              <p className="text-sm font-semibold text-sun">
                {missing} pack{missing === 1 ? "" : "s"} missing ({shortClasses.map((c) => c.className).join(", ")}). A claim opens automatically.
              </p>
            )}
            {errors.root && <p role="alert" className="text-sm font-semibold text-sun">{errors.root}</p>}
            <Button size="lg" onClick={submit} disabled={!canReceive || receive.isPending} className="h-13 bg-sun text-base font-bold text-ink hover:bg-sun/90">
              {receive.isPending
                ? "Confirming…"
                : !allCounted
                  ? "Count every class to confirm"
                  : missing > 0
                    ? `Confirm ${total} received, report shortage`
                    : `Confirm all ${delivery.packs} received`}
            </Button>
            <p className="text-[13px] leading-snug text-line-strong">
              Confirming tells parents the packs are at school and releases {delivery.publisherName}'s payment for the packs received.
            </p>
          </section>
        </aside>
      </div>
    </>
  )
}

function Header({ delivery }: { delivery: SchoolDelivery }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="icon" aria-label="Back to deliveries">
          <Link to="/school/deliveries"><ArrowLeft aria-hidden /></Link>
        </Button>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-muted-foreground">Deliveries</span>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight md:text-[32px]">
            {delivery.status === "received" ? `${delivery.publisherName} delivery` : `Receive ${delivery.publisherName} delivery`}
          </h1>
        </div>
      </div>
      {delivery.expectedAt && delivery.status !== "received" && (
        <span className="rounded-full bg-info-bg px-3 py-1 text-sm font-semibold text-info-fg">Expected {formatDay(delivery.expectedAt)}</span>
      )}
    </div>
  )
}

function Received({ delivery }: { delivery: SchoolDelivery }) {
  const r = delivery.receipt!
  const short = delivery.packs - r.packsReceived
  return (
    <>
      <Header delivery={delivery} />
      <div className="flex flex-wrap items-start gap-5">
        <section className="flex min-w-0 grow basis-[320px] flex-col items-start gap-4 rounded-2xl border bg-card p-6">
          <span className="flex items-center gap-2 font-semibold text-success-fg">
            <CheckCircle2 className="size-5" aria-hidden /> {r.packsReceived} of {delivery.packs} packs received
          </span>
          <div className="flex flex-col gap-2 rounded-2xl bg-ink p-5 text-white">
            <span className="flex items-center gap-2 text-sm text-line-strong">
              <ShieldCheck className="size-4" aria-hidden /> Give the driver this sign-off code
            </span>
            <span className="font-display text-5xl font-semibold tracking-[0.2em]">{r.signOffCode}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {short > 0 || r.issues.length > 0
              ? `${delivery.publisherName} has been told what's wrong and will send replacements. Parents of the affected students get an SMS.`
              : "Parents get an SMS once every publisher's packs are at school."}
          </p>
          <Button asChild variant="outline">
            <Link to="/school/deliveries">Back to deliveries</Link>
          </Button>
        </section>
        <section aria-label="Counts by class" className="min-w-0 grow-[2] basis-[420px] rounded-2xl border bg-card p-4 md:p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead>Check</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delivery.classes.map((c) => (
                <TableRow key={c.className}>
                  <TableCell className="font-semibold">{c.className}</TableCell>
                  <TableCell className="text-right">{c.expected}</TableCell>
                  <TableCell className="text-right">{c.received ?? "—"}</TableCell>
                  <TableCell><Check expected={c.expected} n={c.received} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>
    </>
  )
}

function Check({ expected, n }: { expected: number; n: number | null }) {
  if (n === null) return <span className="text-sm text-muted-foreground">—</span>
  const diff = expected - n
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap",
        diff === 0 ? "bg-info-bg text-info-fg" : "bg-warn-bg text-warn-fg"
      )}
    >
      {diff === 0 ? "Matches" : diff > 0 ? `${diff} short` : `${-diff} extra`}
    </span>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  )
}

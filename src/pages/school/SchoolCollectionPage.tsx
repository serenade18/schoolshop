import { useEffect, useState } from "react"
import { useSearchParams } from "react-router"
import { CheckCircle2, KeyRound, MessageSquare, TriangleAlert } from "lucide-react"

import { PageHeader } from "@/components/common/PageHeader"
import { QueryBoundary } from "@/components/common/QueryBoundary"
import { StatCard } from "@/components/common/StatCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiError } from "@/lib/api/client"
import { useCollection, useHandOverPack, useResendCode } from "@/lib/api/queries"
import type { CollectionRow } from "@/lib/api/schemas"
import { cn } from "@/lib/utils"

type Show = "all" | CollectionRow["status"]
const shows: { id: Show; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ready", label: "Ready" },
  { id: "waiting", label: "Waiting" },
  { id: "collected", label: "Collected" },
]
const pill: Record<CollectionRow["status"], [string, string]> = {
  ready: ["Ready", "bg-success-bg text-success-fg"],
  waiting: ["Waiting", "bg-secondary text-ink-2"],
  collected: ["Collected", "bg-info-bg text-info-fg"],
}
const time = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })

export function SchoolCollectionPage() {
  const collection = useCollection()
  return (
    <>
      <PageHeader eyebrow="Packs go out class by class. The parent's code proves it's the right child." title="Collection" />
      <QueryBoundary query={collection}>{(rows) => <Collection rows={rows} />}</QueryBoundary>
    </>
  )
}

function Collection({ rows }: { rows: CollectionRow[] }) {
  const [params, setParams] = useSearchParams()
  const classes = [...new Set(rows.map((r) => r.className))]
  const stats = (c: string) => {
    const inClass = rows.filter((r) => r.className === c)
    return { total: inClass.length, ready: inClass.filter((r) => r.status === "ready").length, collected: inClass.filter((r) => r.status === "collected").length }
  }
  const firstReady = classes.find((c) => stats(c).ready > 0) ?? classes[0]
  const className = params.get("class") ?? firstReady ?? ""
  const [show, setShow] = useState<Show>("all")

  const ready = rows.filter((r) => r.status === "ready").length
  const collected = rows.filter((r) => r.status === "collected").length
  const waiting = rows.filter((r) => r.status === "waiting")
  const waitingFor = [...new Set(waiting.flatMap((r) => r.waitingFor))]
  const finished = classes.filter((c) => { const s = stats(c); return s.collected === s.total }).length

  const inClass = rows.filter((r) => r.className === className)
  const counts = { all: inClass.length, ready: 0, waiting: 0, collected: 0 }
  for (const r of inClass) counts[r.status]++
  const shown = show === "all" ? inClass : inClass.filter((r) => r.status === show)

  return (
    <>
      <section aria-label="Key numbers" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <StatCard label="Ready to collect" value={ready} hint="Every publisher's part is here" />
        <StatCard label="Collected" value={<>{collected} <span className="text-base font-medium text-muted-foreground">of {rows.length}</span></>} hint="Parents get an SMS when it happens" />
        <StatCard label="Waiting for deliveries" value={waiting.length} hint={waitingFor.length ? `${waitingFor.join(", ")} still to arrive` : "Everything has arrived"} />
        <StatCard label="Classes finished" value={<>{finished} <span className="text-base font-medium text-muted-foreground">of {classes.length}</span></>} hint="Every pack handed out" />
      </section>

      <div role="group" aria-label="Class" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
        {classes.map((c) => {
          const s = stats(c)
          const on = c === className
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => { setParams({ class: c }, { replace: true }); setShow("all") }}
              className={cn("flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[15px] font-semibold whitespace-nowrap", on ? "bg-primary text-primary-foreground" : "border bg-surface hover:bg-paper")}
            >
              {c}
              <span className={cn("rounded-full px-1.5 text-xs", on ? "bg-white/20" : s.ready ? "bg-success-bg text-success-fg" : "bg-secondary")}>
                {s.ready ? `${s.ready} ready` : s.collected === s.total ? "done" : "waiting"}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <CodeCard key={className} className={className} total={inClass.length} collected={counts.collected} ready={counts.ready} />

        <section aria-labelledby="students-h" className="flex min-w-0 grow-[3] basis-[460px] flex-col gap-3 rounded-2xl border bg-card p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="students-h" className="font-display text-xl font-semibold">{className} students</h2>
            <div role="group" aria-label="Show" className="flex flex-wrap gap-1.5">
              {shows.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={show === s.id}
                  onClick={() => setShow(s.id)}
                  className={cn("h-9 rounded-full px-3 text-sm font-semibold", show === s.id ? "bg-primary text-primary-foreground" : "border bg-surface hover:bg-paper")}
                >
                  {s.label} {counts[s.id]}
                </button>
              ))}
            </div>
          </div>
          {shown.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No students here.</p>
          ) : (
            <ul className="flex flex-col">{shown.map((r) => <StudentRow key={r.orderId} row={r} />)}</ul>
          )}
        </section>
      </div>
    </>
  )
}

function CodeCard({ className, total, collected, ready }: { className: string; total: number; collected: number; ready: number }) {
  const [code, setCode] = useState("")
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const hand = useHandOverPack()
  const check = () => {
    if (!/^\d{4}$/.test(code)) return setResult({ ok: false, text: "Collection codes are 4 digits." })
    hand.mutate(
      { className, code },
      {
        onSuccess: (row) => {
          setCode("")
          setResult({ ok: true, text: `Give ${row.studentName} their pack (${row.itemCount} items). Their parent gets an SMS.` })
        },
        onError: (e) => setResult({ ok: false, text: e instanceof ApiError ? (e.fieldErrors.code?.[0] ?? e.message) : "Something went wrong. Try again." }),
      }
    )
  }

  return (
    <section aria-labelledby="code-h" className="flex min-w-0 grow basis-[320px] flex-col gap-4 rounded-2xl border bg-card p-4 md:p-5 lg:sticky lg:top-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="code-h" className="font-display text-xl font-semibold">Hand out · {className}</h2>
          <span className="text-[15px] font-bold">{collected} of {total} collected</span>
        </div>
        <span className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
          <span className="block h-full rounded-full bg-gradient-to-r from-sun to-flame" style={{ width: `${total ? (collected / total) * 100 : 0}%` }} />
        </span>
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          check()
        }}
      >
        <label htmlFor="code" className="text-sm font-semibold">Collection code from the student or parent</label>
        <div className="flex gap-2.5">
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setResult(null) }}
            placeholder="0000"
            className="h-14 min-w-0 grow font-display text-[26px] tracking-[0.3em]"
          />
          <Button type="submit" size="lg" className="h-14" disabled={hand.isPending || ready === 0}>
            <KeyRound aria-hidden /> Check
          </Button>
        </div>
      </form>
      {result && (
        <p role="status" className={cn("flex items-start gap-2.5 rounded-xl p-3.5 text-[15px] font-semibold", result.ok ? "bg-info-bg text-info-fg" : "bg-warn-bg text-warn-fg")}>
          {result.ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden /> : <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />}
          {result.text}
        </p>
      )}
      {import.meta.env.VITE_USE_MOCKS === "true" && <DemoCode className={className} after={collected} />}
      <p className="text-sm text-muted-foreground">
        {ready === 0
          ? "No packs in this class are ready yet. Packs open once every publisher's part has arrived."
          : "The code is in the SMS parents got when they paid. No code? Resend it from the student's row."}
      </p>
    </section>
  )
}

/** Mock mode only: shows one code that works now, like the demo password on sign-in. */
function DemoCode({ className, after }: { className: string; after: number }) {
  const [hint, setHint] = useState<{ studentName: string; code: string } | null>(null)
  useEffect(() => {
    let live = true
    import("@/mocks/adapter").then((m) => live && setHint(m.demoCollectionCode(className)))
    return () => { live = false }
  }, [className, after])
  if (!hint) return null
  return <p className="rounded-xl bg-paper px-3.5 py-2.5 text-[13px] text-muted-foreground">Demo: try <span className="font-mono font-semibold text-ink">{hint.code}</span> for {hint.studentName}.</p>
}

function StudentRow({ row }: { row: CollectionRow }) {
  const resend = useResendCode()
  const [label, tone] = pill[row.status]
  return (
    <li className="flex items-center gap-3 border-b py-3 last:border-0">
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-surface text-sm font-bold">{row.studentName[0]}</span>
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{row.studentName}</span>
        <span className="text-[13px] text-muted-foreground">
          {row.admissionNo} · {row.itemCount} items
          {row.status === "waiting" && ` · waiting for ${row.waitingFor.join(", ")}`}
          {row.status === "collected" && row.collectedAt && ` · ${time.format(new Date(row.collectedAt))}`}
        </span>
        {resend.data && <span role="status" className="text-[13px] font-semibold text-success-fg">Code sent to {resend.data.sentTo}</span>}
        {resend.error && <span role="alert" className="text-[13px] font-semibold text-destructive">{resend.error.message}</span>}
      </span>
      {row.status === "ready" && !resend.data && (
        <Button variant="ghost" size="sm" onClick={() => resend.mutate(row.orderId)} disabled={resend.isPending} aria-label={`Resend code for ${row.studentName}`}>
          <MessageSquare aria-hidden /> <span className="hidden sm:inline">Resend code</span>
        </Button>
      )}
      <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap", tone)}>{label}</span>
    </li>
  )
}

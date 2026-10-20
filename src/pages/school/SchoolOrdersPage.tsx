import { useDeferredValue, useMemo, useState, type ReactNode } from "react"
import { useSearchParams } from "react-router"
import { Dialog } from "radix-ui"
import { BellRing, CheckCircle2, ChevronLeft, ChevronRight, Download, MessageSquareText, Search, X } from "lucide-react"

import { GradientBar } from "@/components/common/GradientBar"
import { PageHeader } from "@/components/common/PageHeader"
import { QueryBoundary } from "@/components/common/QueryBoundary"
import { StatCard } from "@/components/common/StatCard"
import { OrderStatusBadge, ShipmentStatusBadge } from "@/components/common/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRemindParents, useSchoolOrder, useSchoolOrders } from "@/lib/api/queries"
import type { SchoolOrders, StudentOrderRow } from "@/lib/api/schemas"
import { formatDay, formatKes } from "@/lib/format"
import { cn } from "@/lib/utils"

type Filter = "all" | "paid" | "unpaid" | "none"

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All students" },
  { id: "paid", label: "Paid" },
  { id: "unpaid", label: "Started, not paid" },
  { id: "none", label: "No order yet" },
]

const PAGE_SIZE = 25
const DAY = 86_400_000

/** PP1, PP2, Grade 1 … Grade 9 */
const gradeRank = (g: string) => (g.startsWith("PP") ? -10 : 0) + parseInt(g.replace(/\D/g, "") || "0")
const isUnpaid = (r: StudentOrderRow) => r.order?.status === "pending_payment" || r.order?.status === "payment_failed"
const kindOf = (r: StudentOrderRow): Exclude<Filter, "all"> => (!r.order ? "none" : isUnpaid(r) ? "unpaid" : "paid")
const remindedRecently = (r: StudentOrderRow) => !!r.remindedAt && Date.now() - Date.parse(r.remindedAt) < DAY
/** Parents we can still nudge: not paid, have a phone on file, not reminded in the last 24 h. */
const canRemind = (r: StudentOrderRow) => kindOf(r) !== "paid" && !!r.parentPhone && !remindedRecently(r)

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
const ago = (iso: string) => {
  const hours = Math.round((Date.now() - Date.parse(iso)) / 3_600_000)
  return hours < 1 ? "just now" : hours < 24 ? relative.format(-hours, "hour") : relative.format(-Math.round(hours / 24), "day")
}
const paidOn = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })

export function SchoolOrdersPage() {
  const orders = useSchoolOrders()
  return <QueryBoundary query={orders}>{(data) => <ParentOrders data={data} />}</QueryBoundary>
}

function ParentOrders({ data }: { data: SchoolOrders }) {
  const [params, setParams] = useSearchParams()
  const filter = (params.get("show") as Filter | null) ?? "all"
  const grade = params.get("grade") ?? ""
  const className = params.get("class") ?? ""
  const [search, setSearch] = useState("")
  const q = useDeferredValue(search.trim().toLowerCase())
  const [page, setPage] = useState(0)
  const [viewing, setViewing] = useState<StudentOrderRow | null>(null)
  const [reminding, setReminding] = useState<StudentOrderRow[] | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const setParam = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v && !(k === "show" && v === "all")) next.set(k, v)
      else next.delete(k)
    }
    setParams(next, { replace: true })
    setPage(0)
  }

  const grades = [...new Set(data.rows.map((r) => r.gradeName))].sort((a, b) => gradeRank(a) - gradeRank(b))
  // Rows arrive in school order (grade, then class), so first appearance is the right order.
  const classes = [...new Set(data.rows.filter((r) => !grade || r.gradeName === grade).map((r) => r.className))]

  // Grade, class and search narrow everything; the chips then split that set.
  const scoped = useMemo(
    () =>
      data.rows.filter(
        (r) =>
          (!grade || r.gradeName === grade) &&
          (!className || r.className === className) &&
          (!q || `${r.studentName} ${r.admissionNo} ${r.order?.number ?? ""} ${r.parentName ?? ""}`.toLowerCase().includes(q))
      ),
    [data.rows, grade, className, q]
  )
  const counts = { all: scoped.length, paid: 0, unpaid: 0, none: 0 }
  for (const r of scoped) counts[kindOf(r)]++
  const shown = filter === "all" ? scoped : scoped.filter((r) => kindOf(r) === filter)
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const pageRows = shown.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)

  const all = { total: data.rows.length, paid: 0, unpaid: 0, none: 0, value: 0 }
  for (const r of data.rows) {
    all[kindOf(r)]++
    if (kindOf(r) === "paid") all.value += r.order!.totalCents
  }
  const noPhone = data.rows.filter((r) => kindOf(r) !== "paid" && !r.parentPhone).length
  const remindTargets = scoped.filter((r) => kindOf(r) !== "paid")
  const scopeLabel = className || grade || "the whole school"

  const byClass = classes.map((c) => {
    const inClass = data.rows.filter((r) => r.className === c)
    return { name: c, total: inClass.length, paid: inClass.filter((r) => kindOf(r) === "paid").length }
  })

  return (
    <>
      <PageHeader
        eyebrow={`${data.termName} · orders close ${formatDay(data.orderDeadline)}`}
        title="Parent orders"
        actions={
          <>
            <Button variant="outline" onClick={() => downloadCsv(shown, scopeLabel)} disabled={shown.length === 0}>
              <Download aria-hidden /> Download list
            </Button>
            <Button onClick={() => setReminding(remindTargets)} disabled={remindTargets.length === 0}>
              <BellRing aria-hidden /> Remind parents
            </Button>
          </>
        }
      />

      <section aria-label="Key numbers" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <StatCard
          label="Students with a paid order"
          value={<>{all.paid} <span className="text-base font-medium text-muted-foreground">of {all.total}</span></>}
          hint={<GradientBar value={all.paid / all.total} label="Students with a paid order" />}
        />
        <StatCard label="Started, not paid" value={all.unpaid} hint="M-Pesa not completed or failed" />
        <StatCard label="No order yet" value={all.none} hint={`${noPhone} have no parent phone on file`} />
        <StatCard label="Paid so far" value={formatKes(all.value)} hint="Goes to publishers, not the school" />
      </section>

      {notice && (
        <div role="status" className="flex items-start gap-3 rounded-2xl bg-success-bg p-4 text-success-fg">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p className="grow text-[15px]">{notice}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="-m-2 flex size-10 items-center justify-center rounded-lg hover:bg-white/50">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      <section aria-label="Paid orders by class" className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
        {byClass.map((c) => (
          <button
            key={c.name}
            type="button"
            aria-pressed={className === c.name}
            onClick={() => setParam({ class: className === c.name ? "" : c.name })}
            className={cn(
              "flex w-36 shrink-0 flex-col gap-2 rounded-2xl border bg-card p-3.5 text-left transition-colors hover:border-line-strong",
              className === c.name && "border-primary ring-1 ring-primary"
            )}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{c.name}</span>
              <span className="text-sm text-muted-foreground">{Math.round((c.paid / c.total) * 100)}%</span>
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
              <span className="block h-full rounded-full bg-primary" style={{ width: `${(c.paid / c.total) * 100}%` }} />
            </span>
            <span className="text-[13px] text-muted-foreground">{c.paid} of {c.total} paid</span>
          </button>
        ))}
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className="relative">
            <span className="sr-only">Search students</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              placeholder="Student, admission no. or order no."
              className="pl-10"
            />
          </label>
          <NativeSelect aria-label="Grade" value={grade} onChange={(e) => setParam({ grade: e.target.value, class: "" })}>
            <option value="">All grades</option>
            {grades.map((g) => <option key={g}>{g}</option>)}
          </NativeSelect>
          <NativeSelect aria-label="Class" value={className} onChange={(e) => setParam({ class: e.target.value })}>
            <option value="">All classes</option>
            {classes.map((c) => <option key={c}>{c}</option>)}
          </NativeSelect>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" role="group" aria-label="Show">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setParam({ show: f.id })}
              className={cn(
                "flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap",
                filter === f.id ? "bg-primary text-primary-foreground" : "border bg-surface hover:bg-paper"
              )}
            >
              {f.label}
              <span className={cn("rounded-full px-1.5 text-xs", filter === f.id ? "bg-white/20" : "bg-secondary")}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card px-5 py-12 text-center text-muted-foreground">
          {filter === "paid" ? "No paid orders here yet." : filter === "all" ? "No students match your search." : "Everyone here has paid."}
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><span className="sr-only">Action</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((r) => (
                  <TableRow key={r.studentId}>
                    <TableCell>
                      <span className="flex flex-col">
                        <span className="font-semibold">{r.studentName}</span>
                        <span className="text-[13px] text-muted-foreground">{r.admissionNo}</span>
                      </span>
                    </TableCell>
                    <TableCell>{r.className}</TableCell>
                    <TableCell><Parent row={r} /></TableCell>
                    <TableCell>
                      {r.order ? (
                        <span className="flex flex-col">
                          <span className="font-medium">{r.order.number}</span>
                          <span className="text-[13px] text-muted-foreground">{r.order.itemCount} items</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">{r.order ? formatKes(r.order.totalCents) : "—"}</TableCell>
                    <TableCell><RowStatus row={r} /></TableCell>
                    <TableCell className="text-right"><RowAction row={r} onView={() => setViewing(r)} onRemind={() => setReminding([r])} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-2.5 md:hidden">
            {pageRows.map((r) => (
              <li key={r.studentId} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">{r.studentName}</span>
                    <span className="text-[13px] text-muted-foreground">{r.className} · {r.admissionNo}</span>
                  </span>
                  <RowStatus row={r} />
                </div>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  {r.order ? (
                    <span className="text-sm">
                      <span className="font-semibold">{formatKes(r.order.totalCents)}</span>
                      <span className="text-muted-foreground"> · {r.order.number}</span>
                    </span>
                  ) : (
                    <Parent row={r} />
                  )}
                  <RowAction row={r} onView={() => setViewing(r)} onRemind={() => setReminding([r])} />
                </div>
              </li>
            ))}
          </ul>

          <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              Showing {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, shown.length)} of {shown.length}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" aria-label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)}>
                <ChevronLeft aria-hidden />
              </Button>
              <Button variant="outline" size="icon" aria-label="Next page" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </nav>
        </>
      )}

      <OrderSheet row={viewing} onClose={() => setViewing(null)} />
      <RemindSheet
        rows={reminding}
        scopeLabel={reminding?.length === 1 ? reminding[0].studentName : scopeLabel}
        deadline={data.orderDeadline}
        onClose={() => setReminding(null)}
        onDone={(sent, skipped) => {
          setReminding(null)
          setNotice(`Reminder sent to ${sent} parent${sent === 1 ? "" : "s"}.${skipped ? ` ${skipped} skipped (reminded in the last day or no phone).` : ""}`)
        }}
      />
    </>
  )
}

function Parent({ row }: { row: StudentOrderRow }) {
  if (!row.parentName) return <span className="text-sm text-warn-fg">No parent phone on file</span>
  return (
    <span className="flex flex-col">
      <span>{row.parentName}</span>
      <span className="text-[13px] text-muted-foreground">{row.parentPhone}</span>
    </span>
  )
}

function RowStatus({ row }: { row: StudentOrderRow }) {
  if (row.order) return <OrderStatusBadge status={row.order.status} />
  return (
    <span className="flex flex-col items-start gap-1">
      <Badge variant="secondary">No order</Badge>
      {row.remindedAt && <span className="text-xs text-muted-foreground">Reminded {ago(row.remindedAt)}</span>}
    </span>
  )
}

function RowAction({ row, onView, onRemind }: { row: StudentOrderRow; onView: () => void; onRemind: () => void }) {
  if (row.order && !isUnpaid(row)) {
    return <Button size="sm" variant="outline" onClick={onView} aria-label={`View order for ${row.studentName}`}>View</Button>
  }
  return (
    <Button size="sm" variant="outline" onClick={onRemind} disabled={!canRemind(row)} aria-label={`Remind parent of ${row.studentName}`}>
      <BellRing aria-hidden /> Remind
    </Button>
  )
}

function Sheet({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: ReactNode; description: ReactNode; children: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-y-auto rounded-t-3xl bg-surface outline-none",
            "md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[480px] md:rounded-none md:rounded-l-3xl",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-8 md:data-[state=open]:slide-in-from-right-8"
          )}
        >
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-surface px-6 py-5">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="font-display text-xl font-semibold">{title}</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">{description}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close"><X aria-hidden /></Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function OrderSheet({ row, onClose }: { row: StudentOrderRow | null; onClose: () => void }) {
  const order = useSchoolOrder(row?.order?.id ?? null)
  return (
    <Sheet
      open={row !== null}
      onClose={onClose}
      title={row?.studentName}
      description={row ? `${row.className} · ${row.admissionNo}${row.order ? ` · ${row.order.number}` : ""}` : ""}
    >
      <div className="flex flex-col gap-6 px-6 py-5">
        <QueryBoundary query={order}>
          {(o) => (
            <>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Fact label="Status" value={<OrderStatusBadge status={o.status} />} />
                <Fact label="Paid" value={o.paidAt ? paidOn.format(new Date(o.paidAt)) : "—"} />
                <Fact label="M-Pesa receipt" value={<span className="font-mono">{o.mpesaReceipt ?? "—"}</span>} />
                <Fact label="Expected at school" value={o.expectedAtSchool ? formatDay(o.expectedAtSchool) : "—"} />
                <Fact label="Parent" value={o.parentName ? `${o.parentName}, ${o.parentPhone}` : "—"} />
              </dl>
              <section aria-labelledby="sheet-items" className="flex flex-col gap-2">
                <h3 id="sheet-items" className="font-semibold">Items</h3>
                <ul className="text-[15px]">
                  {o.items.map((it) => (
                    <li key={it.id} className="flex justify-between gap-3 border-b border-secondary py-2">
                      <span className="flex min-w-0 flex-col">
                        <span>{it.title}{it.qty > 1 && ` × ${it.qty}`}</span>
                        <span className="text-[13px] text-muted-foreground">{it.publisherName}</span>
                      </span>
                      <span className="shrink-0 font-medium">{formatKes(it.unitPriceCents * it.qty)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between gap-3 py-2 font-semibold">
                    <span>Total</span>
                    <span>{formatKes(o.totalCents)}</span>
                  </li>
                </ul>
              </section>
              <section aria-labelledby="sheet-deliveries" className="flex flex-col gap-2">
                <h3 id="sheet-deliveries" className="font-semibold">Deliveries to school</h3>
                <ul className="flex flex-col gap-2">
                  {o.shipments.map((s) => (
                    <li key={s.publisherName} className="flex items-center justify-between gap-3 rounded-xl bg-paper px-3.5 py-2.5 text-sm">
                      <span><span className="font-semibold">{s.publisherName}</span> · {s.summary}</span>
                      <ShipmentStatusBadge status={s.status} />
                    </li>
                  ))}
                </ul>
              </section>
              <p className="rounded-xl bg-info-bg p-3.5 text-sm text-info-fg">
                At pick-up the parent shows a 4-digit collection code. You check it on the Collection page, so the code is never shown here.
              </p>
            </>
          )}
        </QueryBoundary>
      </div>
    </Sheet>
  )
}

function RemindSheet({
  rows,
  scopeLabel,
  deadline,
  onClose,
  onDone,
}: {
  rows: StudentOrderRow[] | null
  scopeLabel: string
  deadline: string
  onClose: () => void
  onDone: (sent: number, skipped: number) => void
}) {
  const remind = useRemindParents()
  const list = rows ?? []
  const eligible = list.filter(canRemind)
  const noPhone = list.filter((r) => !r.parentPhone).length
  const recent = list.filter((r) => r.parentPhone && remindedRecently(r)).length
  const unpaid = eligible.filter(isUnpaid).length
  const example = eligible[0]

  return (
    <Sheet
      open={rows !== null}
      onClose={() => {
        remind.reset()
        onClose()
      }}
      title="Remind parents"
      description={`SMS from SchoolShop to parents in ${scopeLabel} who haven't paid.`}
    >
      <div className="flex flex-col gap-5 px-6 py-5">
        <dl className="grid grid-cols-3 gap-3 text-center">
          <Count label="Will get an SMS" value={eligible.length} strong />
          <Count label="Reminded in the last day" value={recent} />
          <Count label="No phone on file" value={noPhone} />
        </dl>
        {unpaid > 0 && (
          <p className="text-sm text-muted-foreground">{unpaid} of them started an order but the M-Pesa payment didn't go through. Their SMS links straight back to it.</p>
        )}
        {example && (
          <figure className="flex flex-col gap-2">
            <figcaption className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquareText className="size-4" aria-hidden /> Message preview
            </figcaption>
            <blockquote className="rounded-2xl rounded-tl-sm bg-paper p-4 text-[15px] leading-relaxed">
              Greenhill Academy: {example.studentName.split(" ")[0]}'s {example.gradeName} booklist is on SchoolShop. Order and pay by M-Pesa before {formatDay(deadline)} so books arrive at school. schoolshop.co.ke/s/greenhill-academy
            </blockquote>
          </figure>
        )}
        {noPhone > 0 && (
          <p className="text-sm text-warn-fg">Add missing parent phones on the Classes &amp; students page so they get reminders too.</p>
        )}
        {remind.error && <p role="alert" className="text-sm text-destructive">{remind.error.message}</p>}
        <div className="flex flex-wrap gap-2.5">
          <Button
            disabled={eligible.length === 0 || remind.isPending}
            onClick={() =>
              remind.mutate(eligible.map((r) => r.studentId), { onSuccess: (res) => onDone(res.sent, res.skipped + list.length - eligible.length) })
            }
          >
            <BellRing aria-hidden /> {remind.isPending ? "Sending…" : eligible.length === 0 ? "Nobody to remind" : `Send to ${eligible.length} parent${eligible.length === 1 ? "" : "s"}`}
          </Button>
          <Dialog.Close asChild>
            <Button variant="outline">Cancel</Button>
          </Dialog.Close>
        </div>
      </div>
    </Sheet>
  )
}

function Count({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-xl p-3", strong ? "bg-teal-light" : "bg-paper")}>
      <dd className={cn("font-display text-2xl font-semibold", strong && "text-accent-text")}>{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
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

function downloadCsv(rows: StudentOrderRow[], scope: string) {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const status = (r: StudentOrderRow) => (kindOf(r) === "paid" ? "Paid" : kindOf(r) === "unpaid" ? "Started, not paid" : "No order")
  const lines = [
    ["Student", "Admission no.", "Grade", "Class", "Parent", "Order", "Status", "Total (KES)"],
    ...rows.map((r) => [r.studentName, r.admissionNo, r.gradeName, r.className, r.parentName ?? "", r.order?.number ?? "", status(r), r.order ? String(r.order.totalCents / 100) : ""]),
  ]
  const blob = new Blob([lines.map((l) => l.map(cell).join(",")).join("\n")], { type: "text/csv" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `parent-orders-${scope.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

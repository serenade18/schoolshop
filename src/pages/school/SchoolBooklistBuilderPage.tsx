import { useDeferredValue, useState } from "react"
import { Link, useParams } from "react-router"
import { Dialog } from "radix-ui"
import { ArrowLeft, CheckCircle2, MessageSquarePlus, Search, Send, X } from "lucide-react"

import { QueryBoundary } from "@/components/common/QueryBoundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError } from "@/lib/api/client"
import type { BooklistInput } from "@/lib/api/endpoints"
import { useBooklist, useSaveBooklist, useSchoolCatalog } from "@/lib/api/queries"
import type { Booklist, SchoolCatalogItem } from "@/lib/api/schemas"
import { formatDay, formatKes } from "@/lib/format"
import { cn } from "@/lib/utils"

type Line = {
  productId: string
  title: string
  publisherName: string
  subject: string
  unitPriceCents: number
  required: boolean
  qtyPerStudent: number
  note: string | null
}

const categories = [
  { id: "all", label: "All" },
  { id: "textbook", label: "Textbooks" },
  { id: "reader", label: "Readers" },
  { id: "reference", label: "Reference" },
  { id: "stationery", label: "Stationery" },
]

const toLines = (list: Booklist): Line[] =>
  list.items.map((i) => ({ productId: i.productId, title: i.title, publisherName: i.publisherName, subject: i.subject, unitPriceCents: i.unitPriceCents, required: i.required, qtyPerStudent: i.qtyPerStudent, note: i.note }))
const toInput = (lines: Line[], orderDeadline: string, deliverBy: string): BooklistInput => ({
  orderDeadline,
  deliverBy,
  items: lines.map((l) => ({ productId: l.productId, required: l.required, qtyPerStudent: l.qtyPerStudent, note: l.note?.trim() || null })),
})

export function SchoolBooklistBuilderPage() {
  const { id = "" } = useParams()
  const list = useBooklist(id)
  return <QueryBoundary query={list}>{(l) => <Builder key={l.id} list={l} />}</QueryBoundary>
}

function Builder({ list }: { list: Booklist }) {
  const [lines, setLines] = useState(() => toLines(list))
  const [orderDeadline, setOrderDeadline] = useState(list.orderDeadline)
  const [deliverBy, setDeliverBy] = useState(list.deliverBy)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const save = useSaveBooklist()

  const input = toInput(lines, orderDeadline, deliverBy)
  const dirty = JSON.stringify(input) !== JSON.stringify(toInput(toLines(list), list.orderDeadline, list.deliverBy))
  const published = list.status === "published"
  const requiredTotal = lines.filter((l) => l.required).reduce((t, l) => t + l.unitPriceCents * l.qtyPerStudent, 0)
  const allTotal = lines.reduce((t, l) => t + l.unitPriceCents * l.qtyPerStudent, 0)
  const onList = new Set(lines.map((l) => l.productId))

  const update = (productId: string, change: Partial<Line>) => {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...change } : l)))
    setNotice(null)
  }
  const add = (c: SchoolCatalogItem) => {
    setLines((prev) => [...prev, { productId: c.productId, title: c.title, publisherName: c.publisherName, subject: c.subject, unitPriceCents: c.priceCents, required: true, qtyPerStudent: 1, note: null }])
    setNotice(null)
  }

  const submit = (publish: boolean) => {
    setErrors({})
    save.mutate(
      { id: list.id, input, publish },
      {
        onSuccess: () => {
          setConfirming(false)
          setNotice(
            publish
              ? `Published. Parents in ${list.classNames.join(", ")} get an SMS with the link today.`
              : published
                ? "Changes saved. They apply to new orders; parents who already ordered keep theirs."
                : "Draft saved. Parents can't see it until you publish."
          )
        },
        onError: (e) => {
          setConfirming(false)
          const f = e instanceof ApiError ? e.fieldErrors : {}
          const fields = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v[0]]))
          setErrors(Object.keys(fields).length ? fields : { root: e.message })
        },
      }
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" aria-label="Back to booklists">
            <Link to="/school/booklists"><ArrowLeft aria-hidden /></Link>
          </Button>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-muted-foreground">{list.schoolName} · {list.termName}</span>
            <h1 className="flex flex-wrap items-center gap-3 text-[28px] leading-tight font-semibold tracking-tight md:text-[32px]">
              {list.gradeName} booklist
              <Badge variant={published ? "success" : "secondary"}>{published ? "Published" : "Draft"}</Badge>
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {published ? (
            <Button onClick={() => submit(false)} disabled={!dirty || save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => submit(false)} disabled={!dirty || save.isPending}>Save draft</Button>
              <Button onClick={() => setConfirming(true)} disabled={save.isPending || lines.length === 0}>
                <Send aria-hidden /> Publish to parents
              </Button>
            </>
          )}
        </div>
      </div>

      {notice && (
        <div role="status" className="flex items-start gap-3 rounded-2xl bg-success-bg p-4 text-success-fg">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p className="grow text-[15px]">{notice}</p>
        </div>
      )}
      {(errors.root || errors.items) && <p role="alert" className="rounded-2xl bg-warn-bg p-4 text-[15px] text-warn-fg">{errors.root ?? errors.items}</p>}
      {published && dirty && (
        <p className="rounded-2xl bg-info-bg p-4 text-[15px] text-info-fg">This list is live. Changes apply to new orders; parents who already ordered keep their order.</p>
      )}

      <div className="flex flex-wrap items-start gap-5">
        <Catalog gradeName={list.gradeName} onList={onList} onAdd={add} />

        <section aria-labelledby="list-h" className="flex min-w-0 grow-[1.3] basis-[440px] flex-col gap-4 rounded-2xl border bg-card p-4 max-lg:order-first md:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="list-h" className="font-display text-xl font-semibold">On this list</h2>
            <span className="text-sm text-muted-foreground">Applies to {list.classNames.join(", ")}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deadline">Parent order deadline</Label>
              <Input id="deadline" type="date" value={orderDeadline} onChange={(e) => setOrderDeadline(e.target.value)} aria-invalid={!!errors.orderDeadline} />
              {errors.orderDeadline && <p className="text-sm text-destructive">{errors.orderDeadline}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deliver">Deliver to school by</Label>
              <Input id="deliver" type="date" value={deliverBy} onChange={(e) => setDeliverBy(e.target.value)} aria-invalid={!!errors.deliverBy} />
              {errors.deliverBy && <p className="text-sm text-destructive">{errors.deliverBy}</p>}
            </div>
          </div>

          {lines.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-10 text-center text-muted-foreground">Nothing on the list yet. Add titles from the publisher catalogs.</p>
          ) : (
            <ul className="flex flex-col">
              {lines.map((l) => <LineRow key={l.productId} line={l} onChange={(c) => update(l.productId, c)} onRemove={() => setLines((prev) => prev.filter((x) => x.productId !== l.productId))} />)}
            </ul>
          )}

          <div className="flex flex-wrap justify-between gap-3 rounded-xl bg-paper px-4 py-3.5">
            <span className="flex flex-col gap-0.5">
              <span className="text-[13px] text-muted-foreground">Required pack</span>
              <span className="font-display text-[22px] font-semibold">{formatKes(requiredTotal)}</span>
            </span>
            <span className="flex flex-col gap-0.5 text-right">
              <span className="text-[13px] text-muted-foreground">With all optional items</span>
              <span className="font-display text-[22px] font-semibold">{formatKes(allTotal)}</span>
            </span>
          </div>
        </section>
      </div>

      <Dialog.Root open={confirming} onOpenChange={setConfirming}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-w-md -translate-y-1/2 flex-col gap-4 rounded-3xl bg-surface p-6 outline-none">
            <div className="flex items-start justify-between gap-3">
              <Dialog.Title className="font-display text-xl font-semibold">Publish the {list.gradeName} list?</Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close"><X aria-hidden /></Button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-[15px] text-ink-2">
              Parents in {list.classNames.join(", ")} get an SMS with the link and can order until {orderDeadline ? formatDay(orderDeadline) : "the deadline"}. The required pack is {formatKes(requiredTotal)}.
            </Dialog.Description>
            <div className="flex flex-wrap gap-2.5">
              <Button onClick={() => submit(true)} disabled={save.isPending}>{save.isPending ? "Publishing…" : "Publish and notify parents"}</Button>
              <Dialog.Close asChild>
                <Button variant="outline">Not yet</Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

function LineRow({ line, onChange, onRemove }: { line: Line; onChange: (c: Partial<Line>) => void; onRemove: () => void }) {
  const [noteOpen, setNoteOpen] = useState(!!line.note)
  const id = `req-${line.productId}`
  return (
    <li className="flex flex-col gap-2 border-b py-3 last:border-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex min-w-0 grow basis-44 flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{line.title}</span>
          <span className="text-[13px] text-muted-foreground">{line.publisherName} · {formatKes(line.unitPriceCents)}{line.qtyPerStudent > 1 && ` × ${line.qtyPerStudent}`}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <label htmlFor={id} className="mr-1.5 flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
            <Checkbox id={id} checked={line.required} onCheckedChange={(on) => onChange({ required: on === true })} />
            Required
          </label>
          <Input
            type="number"
            min={1}
            max={20}
            value={line.qtyPerStudent}
            onChange={(e) => onChange({ qtyPerStudent: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
            aria-label={`Quantity per student for ${line.title}`}
            className="h-11 w-16"
          />
          <Button variant="ghost" size="icon" onClick={() => setNoteOpen((o) => !o)} aria-label={`Note to parents about ${line.title}`} aria-pressed={noteOpen}>
            <MessageSquarePlus aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" onClick={onRemove} aria-label={`Remove ${line.title}`}>
            <X aria-hidden />
          </Button>
        </span>
      </div>
      {noteOpen && (
        <Input
          value={line.note ?? ""}
          maxLength={140}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="Note to parents, e.g. Last year's copy is fine if it's in good condition"
          aria-label={`Note to parents about ${line.title}`}
          className="h-11 text-[15px]"
        />
      )}
    </li>
  )
}

function Catalog({ gradeName, onList, onAdd }: { gradeName: string; onList: Set<string>; onAdd: (c: SchoolCatalogItem) => void }) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const q = useDeferredValue(search.trim())
  const catalog = useSchoolCatalog(q, category)
  // Titles for this grade first, then ones for every grade, then the rest.
  const rank = (c: SchoolCatalogItem) => (c.gradeLabel === gradeName ? 0 : c.gradeLabel === "All grades" ? 1 : 2)

  return (
    <section aria-labelledby="catalog-h" className="flex min-w-0 grow basis-[380px] flex-col gap-4 rounded-2xl border bg-card p-4 md:p-5">
      <h2 id="catalog-h" className="font-display text-xl font-semibold">Add from publisher catalogs</h2>
      <label className="relative">
        <span className="sr-only">Search titles, ISBN or publisher</span>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles, ISBN or publisher" className="pl-10" />
      </label>
      <div role="group" aria-label="Category" className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={category === c.id}
            onClick={() => setCategory(c.id)}
            className={cn("h-9 rounded-full px-3.5 text-sm font-semibold", category === c.id ? "bg-primary text-primary-foreground" : "border bg-surface hover:bg-paper")}
          >
            {c.label}
          </button>
        ))}
      </div>
      <QueryBoundary query={catalog}>
        {(items) =>
          items.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No titles match. Try the title, publisher or ISBN.</p>
          ) : (
            <ul className="flex max-h-[640px] flex-col overflow-y-auto">
              {[...items].sort((a, b) => rank(a) - rank(b)).map((c) => (
                <li key={c.productId} className="flex items-center gap-3 border-b py-3 last:border-0">
                  <span className="flex min-w-0 grow flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">{c.title}</span>
                    <span className="text-[13px] text-muted-foreground">
                      {c.publisherName} · {formatKes(c.priceCents)} · {c.gradeLabel}
                      {c.isbn && <span className="hidden sm:inline"> · ISBN {c.isbn}</span>}
                    </span>
                  </span>
                  {onList.has(c.productId) ? (
                    <span className="shrink-0 px-1.5 text-[13px] font-semibold whitespace-nowrap text-muted-foreground">On list</span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => onAdd(c)} aria-label={`Add ${c.title}`}>Add</Button>
                  )}
                </li>
              ))}
            </ul>
          )
        }
      </QueryBoundary>
    </section>
  )
}

import { useState } from "react"
import { Link, useParams } from "react-router"

import { GradientBar } from "@/components/common/GradientBar"
import { QueryBoundary } from "@/components/common/QueryBoundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSchool, useSchoolBooklists } from "@/lib/api/queries"
import type { Booklist } from "@/lib/api/schemas"
import { formatDayLong, formatKes } from "@/lib/format"
import { cn } from "@/lib/utils"

export function SchoolPage() {
  const { slug = "" } = useParams()
  const school = useSchool(slug)
  const lists = useSchoolBooklists(slug)

  return (
    <QueryBoundary query={school}>
      {(s) => (
        <>
          <section className="bg-paper">
            <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-5 px-5 py-10">
              <div className="flex items-center gap-4.5">
                <span aria-hidden className="flex size-18 items-center justify-center rounded-2xl bg-ink font-display text-3xl font-semibold text-sun">
                  {s.name[0]}
                </span>
                <div className="flex flex-col gap-1.5">
                  <h1 className="text-4xl font-semibold tracking-tight">{s.name}</h1>
                  <span className="flex flex-wrap items-center gap-2.5 text-[15px] text-ink/85">
                    {s.town}
                    {s.verified && <Badge variant="info">Verified school</Badge>}
                  </span>
                </div>
              </div>
              {lists.data?.[0] && (
                <div className="flex flex-col text-right">
                  <span className="text-sm text-muted-foreground">{lists.data[0].termName} · order by</span>
                  <span className="font-display text-2xl font-semibold">{formatDayLong(lists.data[0].orderDeadline)}</span>
                </div>
              )}
            </div>
          </section>
          <div className="mx-auto max-w-6xl px-5 pt-7 pb-16">
            <QueryBoundary query={lists}>
              {(data) =>
                data.length ? (
                  <Booklists lists={data} />
                ) : (
                  <p className="text-muted-foreground">This school hasn't published a list for this term yet.</p>
                )
              }
            </QueryBoundary>
          </div>
        </>
      )}
    </QueryBoundary>
  )
}

function Booklists({ lists }: { lists: Booklist[] }) {
  const [selectedId, setSelectedId] = useState(lists[0].id)
  const list = lists.find((l) => l.id === selectedId) ?? lists[0]
  const required = list.items.filter((i) => i.required)
  const total = required.reduce((s, i) => s + i.unitPriceCents * i.qtyPerStudent, 0)

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Grade" className="flex flex-wrap gap-2">
        {lists.map((l) => (
          <button
            key={l.id}
            role="tab"
            type="button"
            aria-selected={l.id === list.id}
            onClick={() => setSelectedId(l.id)}
            className={cn(
              "h-11 rounded-full px-4.5 text-[15px]",
              l.id === list.id ? "bg-ink font-semibold text-white" : "border bg-surface font-medium"
            )}
          >
            {l.gradeName}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-start gap-7">
        <section role="tabpanel" aria-label={`${list.gradeName} booklist`} className="min-w-0 grow-[999] basis-[520px] rounded-2xl border px-5.5 py-2">
          <ul>
            {list.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3.5 border-b border-secondary py-3.5 last:border-0">
                <span aria-hidden className="h-13.5 w-10 shrink-0 rounded-md bg-linear-to-b from-[#fde7c8] to-sun/70" />
                <span className="flex min-w-0 grow flex-col gap-0.5">
                  <span className="font-semibold">{i.title}</span>
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    {i.publisherName}
                    {!i.required && <Badge variant="secondary" className="px-2 py-0.5 text-[11px]">Optional</Badge>}
                  </span>
                </span>
                <span className="font-semibold whitespace-nowrap">{formatKes(i.unitPriceCents * i.qtyPerStudent)}</span>
              </li>
            ))}
          </ul>
        </section>
        <aside aria-label="Buy this list" className="flex min-w-0 grow basis-72 flex-col gap-3.5 rounded-2xl bg-ink p-6 text-white">
          <span className="text-sm text-white/80">{list.gradeName} required pack</span>
          <span className="font-display text-4xl font-semibold">{formatKes(total)}</span>
          <GradientBar value={1} className="h-1 bg-white/20" />
          <ul className="flex list-disc flex-col gap-1.5 pl-4.5 text-[15px] leading-snug text-white/80">
            <li>Untick anything your child already has</li>
            <li>Pay with M-Pesa or card</li>
            <li>Delivered to {list.schoolName}, free</li>
          </ul>
          <Button asChild variant="brand" size="lg" className="font-bold">
            <Link to="/parent">Buy {list.gradeName} list</Link>
          </Button>
          <span className="text-center text-[13px] text-white/80">You'll sign in with your phone number</span>
        </aside>
      </div>
    </div>
  )
}

import { useEffect } from "react"
import { Link, Navigate, useParams, useSearchParams } from "react-router"
import { Info } from "lucide-react"

import { QueryBoundary } from "@/components/common/QueryBoundary"
import { SectionLabel } from "@/components/common/SectionLabel"
import { ParentPageHeader } from "@/components/layout/ParentLayout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useBooklist, useChildren } from "@/lib/api/queries"
import { formatKes } from "@/lib/format"
import { useCartStore } from "@/stores/cart"

export function BooklistPage() {
  const { booklistId = "" } = useParams()
  const studentId = useSearchParams()[0].get("student")
  const booklist = useBooklist(booklistId)
  const children = useChildren()
  const child = children.data?.find((c) => c.id === studentId)
  const { excludedItemIds, toggleItem, includeAll, start } = useCartStore()

  const optionalIds = booklist.data?.items.filter((i) => !i.required).map((i) => i.id)
  useEffect(() => {
    if (studentId && optionalIds) start(studentId, booklistId, optionalIds)
    // optionalIds is derived from the fetched list; re-run only when that list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, booklistId, booklist.data, start])

  if (!studentId) return <Navigate to="/parent" replace />

  return (
    <QueryBoundary query={booklist}>
      {(list) => {
        const chosen = list.items.filter((i) => !excludedItemIds.includes(i.id))
        const total = chosen.reduce((s, i) => s + i.unitPriceCents * i.qtyPerStudent, 0)
        return (
          <>
            <ParentPageHeader
              back="/parent"
              title={child ? `${child.name}'s ${list.termName.split(",")[0]} list` : `${list.gradeName} list`}
              subtitle={`${child?.className ?? list.gradeName} · ${list.schoolName}`}
            />
            <div className="parent-split">
            <div className="flex flex-col gap-3">
              <p className="flex items-start gap-2.5 rounded-xl bg-teal-light p-3.5 text-sm leading-snug text-ink">
                <Info className="mt-0.5 size-4.5 shrink-0 text-accent-text" aria-hidden />
                Set by the school. Untick anything {child?.name ?? "your child"} already has, and tick any optional extras you want.
              </p>
              <div className="flex items-baseline justify-between">
                <SectionLabel>{list.items.length} items on this list</SectionLabel>
                <Button variant="link" className="px-0" onClick={includeAll}>
                  Select all
                </Button>
              </div>
              <ul className="flex flex-col gap-2">
                {list.items.map((item) => {
                  const id = `item-${item.id}`
                  return (
                    <li key={item.id} className="parent-row rounded-xl border bg-card">
                      <label htmlFor={id} className="flex cursor-pointer items-center gap-3 p-3.5">
                        <Checkbox
                          id={id}
                          checked={!excludedItemIds.includes(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                        />
                        <span className="flex min-w-0 grow flex-col gap-0.5">
                          <span className="text-[15px] leading-snug font-semibold">{item.title}</span>
                          <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                            {item.publisherName}
                            {item.required && (
                              <Badge variant="secondary" className="px-1.5 py-0.5 text-[11px]">Required</Badge>
                            )}
                          </span>
                        </span>
                        <span className="text-[15px] font-semibold whitespace-nowrap">
                          {formatKes(item.unitPriceCents * item.qtyPerStudent)}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className="parent-summary fixed inset-x-0 bottom-[76px] z-10 mx-auto flex max-w-lg flex-col gap-2.5 border-t bg-surface px-5 py-3.5 md:border-x">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">
                  {chosen.length} of {list.items.length} selected
                </span>
                <span className="font-display text-[22px] font-semibold">{formatKes(total)}</span>
              </div>
              {chosen.length ? (
                <Button asChild size="lg">
                  <Link to="/parent/checkout">Continue to checkout</Link>
                </Button>
              ) : (
                <Button size="lg" disabled>Choose at least one item</Button>
              )}
            </div>
            </div>
            <div className="parent-spacer h-32" aria-hidden />
          </>
        )
      }}
    </QueryBoundary>
  )
}

import { Link } from "react-router"
import { ArrowRight, ChevronRight, Plus, School } from "lucide-react"

import { GradientBar } from "@/components/common/GradientBar"
import { OrderStatusBadge } from "@/components/common/StatusBadge"
import { QueryBoundary } from "@/components/common/QueryBoundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useChildren } from "@/lib/api/queries"
import type { Child } from "@/lib/api/schemas"
import { formatDay } from "@/lib/format"
import { useAuthStore } from "@/stores/auth"

import { ParentDesktopHome } from "./ParentDesktopHome"

export function ParentHomePage() {
  const name = useAuthStore((s) => s.user?.name.split(" ")[0])
  const children = useChildren()

  return (
    <>
      <ParentDesktopHome firstName={name} />
      <div className="flex flex-col gap-5 lg:hidden">
        <div className="flex flex-col gap-1">
          <p className="text-[15px] text-muted-foreground">Hello{name ? `, ${name}` : ""}</p>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Term 1 shopping, sorted.</h1>
        </div>

        <QueryBoundary query={children}>
          {(list) => (
            <section aria-label="Your children" className="flex flex-col gap-3">
              {list.map((c) => <ChildCard key={c.id} child={c} />)}
              <Button asChild variant="outline" size="lg" className="border-dashed bg-transparent">
                <Link to="/parent/children">
                  <Plus aria-hidden /> Add a child with school code
                </Link>
              </Button>
            </section>
          )}
        </QueryBoundary>

        <section aria-label="Delivery" className="flex items-start gap-3 rounded-2xl bg-ink p-4.5 text-white">
          <School className="mt-0.5 size-5.5 shrink-0 text-sun" aria-hidden />
          <div className="flex flex-col gap-1">
            <span className="text-[15px] font-semibold">Everything is delivered to school</span>
            <span className="text-sm leading-snug text-white/80">
              Your child collects their pack from the class teacher. No courier fees.
            </span>
          </div>
        </section>
      </div>
    </>
  )
}

function ChildCard({ child }: { child: Child }) {
  const list = child.openBooklist
  const order = child.latestOrder
  return (
    <article className="flex flex-col gap-3.5 rounded-2xl border bg-card p-4.5">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-teal-light font-display text-lg font-semibold text-teal">
          {child.name[0]}
        </span>
        <div className="flex min-w-0 grow flex-col">
          <span className="text-[17px] font-semibold">{child.name}</span>
          <span className="text-sm text-muted-foreground">
            {child.gradeName} · {child.schoolName}
          </span>
        </div>
        {list ? <Badge variant="warning">List ready</Badge> : order && <OrderStatusBadge status={order.status} />}
      </div>

      {list && (
        <>
          <GradientBar value={1} className="h-1" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{list.itemCount} items</span>
            <span>Order by {formatDay(list.orderDeadline)}</span>
          </div>
          <Button asChild size="lg">
            <Link to={`/parent/lists/${list.id}?student=${child.id}`}>
              View booklist <ArrowRight aria-hidden />
            </Link>
          </Button>
        </>
      )}

      {!list && order && (
        <Link
          to={`/parent/orders/${order.id}`}
          className="flex h-12 items-center justify-between rounded-xl border px-3.5 text-[15px] font-semibold"
        >
          <span>
            Order #{order.number}
            {order.expectedAtSchool && ` · at school by ${formatDay(order.expectedAtSchool)}`}
          </span>
          <ChevronRight className="size-4.5" aria-hidden />
        </Link>
      )}
    </article>
  )
}

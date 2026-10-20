import type { ReactNode } from "react"
import { Link } from "react-router"
import { AlertCircle, ArrowRight, CheckCircle2, ChevronRight, CreditCard, KeyRound, ListChecks, Plus, School } from "lucide-react"

import { QueryBoundary } from "@/components/common/QueryBoundary"
import { OrderStatusBadge } from "@/components/common/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useChildren, useOrders } from "@/lib/api/queries"
import type { Child, Order, OrderStatus } from "@/lib/api/schemas"
import { daysUntil, formatDay, formatKes } from "@/lib/format"
import { cn } from "@/lib/utils"

/*
 * The parent home at lg and up: what needs doing, each child's progress,
 * recent orders, and a rail with dates and collection codes. The phone
 * layout lives in ParentHomePage and is unchanged.
 */

const steps = ["Ordered", "Paid", "At school", "Collected"]
const stepReached: Partial<Record<OrderStatus, number>> = {
  pending_payment: 0,
  payment_failed: 0,
  paid: 1,
  in_fulfilment: 1,
  partially_refunded: 1,
  at_school: 2,
  collected: 3,
}
const paidOn = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short" })
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

export function ParentDesktopHome({ firstName }: { firstName?: string }) {
  const children = useChildren()
  const orders = useOrders()
  return (
    <div className="hidden flex-col gap-8 lg:flex">
      <header className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-[15px] text-muted-foreground">Hello{firstName ? `, ${firstName}` : ""} · Term 1, 2027</p>
          <h1 className="text-[38px] leading-tight font-semibold tracking-tight">Term 1 shopping, sorted.</h1>
        </div>
        <Button asChild variant="outline">
          <Link to="/parent/children"><Plus aria-hidden /> Add a child</Link>
        </Button>
      </header>
      <QueryBoundary query={children}>{(kids) => <Dashboard kids={kids} orders={orders.data?.results ?? []} />}</QueryBoundary>
    </div>
  )
}

function Dashboard({ kids, orders }: { kids: Child[]; orders: Order[] }) {
  const orderFor = (c: Child) => (c.latestOrder ? orders.find((o) => o.id === c.latestOrder!.id) : undefined)
  const todos = kids.flatMap((c) => todoFor(c, orderFor(c)))
  const codes = kids.flatMap((c) => {
    const o = orderFor(c)
    return o?.collectionCode && o.status !== "collected" ? [{ child: c, order: o }] : []
  })
  const dates = kids
    .flatMap((c) => [
      ...(c.openBooklist && !c.latestOrder ? [{ date: c.openBooklist.orderDeadline, label: `Last day to order ${c.name}'s list`, urgent: daysUntil(c.openBooklist.orderDeadline) <= 3 }] : []),
      ...(c.latestOrder?.expectedAtSchool && (stepReached[c.latestOrder.status] ?? -1) < 2
        ? [{ date: c.latestOrder.expectedAtSchool, label: `${c.name}'s pack at school`, urgent: false }]
        : []),
    ])
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-8">
        <section aria-labelledby="todo-h" className="flex flex-col gap-3">
          <SectionTitle id="todo-h">To do</SectionTitle>
          {todos.length ? (
            <ul className="flex flex-col gap-2.5">{todos.map((t) => <TodoRow key={t.key} todo={t} />)}</ul>
          ) : (
            <p className="flex items-center gap-3 rounded-2xl border bg-card p-4 text-[15px]">
              <CheckCircle2 className="size-5 text-success-fg" aria-hidden /> Nothing needs you right now. We'll SMS you when something changes.
            </p>
          )}
        </section>

        <section aria-labelledby="kids-h" className="flex flex-col gap-3">
          <SectionTitle id="kids-h">Your children</SectionTitle>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-4">
            {kids.map((c) => <ChildPanel key={c.id} child={c} order={orderFor(c)} />)}
          </div>
        </section>

        {orders.length > 0 && (
          <section aria-labelledby="orders-h" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <SectionTitle id="orders-h">Recent orders</SectionTitle>
              <Link to="/parent/orders" className="text-sm font-semibold text-accent-text hover:underline">All orders</Link>
            </div>
            <ul className="overflow-hidden rounded-2xl border bg-card">
              {orders.slice(0, 5).map((o) => (
                <li key={o.id} className="border-b last:border-0">
                  <Link to={`/parent/orders/${o.id}`} className="grid grid-cols-[1.2fr_1fr_0.8fr_auto_20px] items-center gap-4 px-5 py-3.5 text-[15px] hover:bg-paper-2">
                    <span className="flex flex-col">
                      <span className="font-semibold">{o.number}</span>
                      <span className="text-[13px] text-muted-foreground">{o.studentName} · {o.className}</span>
                    </span>
                    <span className="text-muted-foreground">{o.paidAt ? `Paid ${paidOn.format(new Date(o.paidAt))}` : "Not paid yet"}</span>
                    <span className="font-semibold">{formatKes(o.totalCents)}</span>
                    <OrderStatusBadge status={o.status} />
                    <ChevronRight className="size-4.5 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside aria-label="At a glance" className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] items-start gap-4 xl:sticky xl:top-8 xl:flex xl:flex-col xl:items-stretch">
        {dates.length > 0 && (
          <section aria-labelledby="dates-h" className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
            <h2 id="dates-h" className="font-display text-lg font-semibold">Key dates</h2>
            <ul className="flex flex-col gap-3">
              {dates.map((d) => {
                const [, m, day] = d.date.split("-")
                const left = daysUntil(d.date)
                return (
                  <li key={d.label} className="flex items-center gap-3">
                    <span className={cn("flex size-12 shrink-0 flex-col items-center justify-center rounded-xl leading-none", d.urgent ? "bg-warn-bg text-warn-fg" : "bg-teal-light text-accent-text")}>
                      <span className="font-display text-lg font-semibold">{Number(day)}</span>
                      <span className="text-[11px] font-bold uppercase">{new Date(2000, Number(m) - 1).toLocaleString("en", { month: "short" })}</span>
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[15px] font-semibold">{d.label}</span>
                      <span className="text-[13px] text-muted-foreground">{left < 0 ? "Passed" : left === 0 ? "Today" : `In ${plural(left, "day")}`}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {codes.length > 0 && (
          <section aria-labelledby="codes-h" className="flex flex-col gap-3 rounded-2xl bg-ink p-5 text-white">
            <h2 id="codes-h" className="flex items-center gap-2 font-display text-lg font-semibold">
              <KeyRound className="size-4.5 text-sun" aria-hidden /> Collection codes
            </h2>
            <ul className="flex flex-col gap-2.5">
              {codes.map(({ child, order }) => (
                <li key={order.id} className="flex items-center justify-between gap-3 rounded-xl bg-ink-2 px-4 py-3">
                  <span className="flex flex-col">
                    <span className="font-semibold">{child.name}</span>
                    <span className="text-[13px] text-line-strong">{order.number}</span>
                  </span>
                  <span className="font-display text-2xl font-semibold tracking-[0.18em]">{order.collectionCode}</span>
                </li>
              ))}
            </ul>
            <p className="text-[13px] leading-snug text-line-strong">Your child's teacher asks for this code when handing over the pack. Keep it private.</p>
          </section>
        )}

        <section className="flex items-start gap-3 rounded-2xl bg-teal-light p-5">
          <School className="mt-0.5 size-5 shrink-0 text-accent-text" aria-hidden />
          <div className="flex flex-col gap-1">
            <span className="text-[15px] font-semibold">Everything is delivered to school</span>
            <span className="text-sm leading-snug text-ink-2">Your child collects their pack from the class teacher. No courier fees.</span>
          </div>
        </section>
      </aside>
    </div>
  )
}

type Todo = { key: string; icon: ReactNode; title: string; detail: string; tone: "warn" | "info"; action: { label: string; to: string } }

function todoFor(c: Child, order: Order | undefined): Todo[] {
  const o = c.latestOrder
  if (o?.status === "pending_payment") {
    return [{ key: `${c.id}-pay`, icon: <CreditCard aria-hidden />, tone: "warn", title: `Finish paying for ${c.name}'s order`, detail: `${o.number}${order ? ` · ${formatKes(order.totalCents)}` : ""}. Nothing is packed until it's paid.`, action: { label: "Pay now", to: `/parent/orders/${o.id}` } }]
  }
  if (o?.status === "payment_failed") {
    return [{ key: `${c.id}-retry`, icon: <AlertCircle aria-hidden />, tone: "warn", title: `${c.name}'s payment didn't go through`, detail: `${o.number}. Try again with M-Pesa; you haven't been charged.`, action: { label: "Try again", to: `/parent/orders/${o.id}` } }]
  }
  if (o?.status === "at_school") {
    return [{ key: `${c.id}-collect`, icon: <KeyRound aria-hidden />, tone: "info", title: `${c.name}'s pack is at school`, detail: `Collect from the class teacher with code ${order?.collectionCode ?? "on your order"}.`, action: { label: "View order", to: `/parent/orders/${o.id}` } }]
  }
  const list = c.openBooklist
  if (list && !o) {
    const left = daysUntil(list.orderDeadline)
    return [{
      key: `${c.id}-order`,
      icon: <ListChecks aria-hidden />,
      tone: left <= 3 ? "warn" : "info",
      title: `Order ${c.name}'s ${list.gradeName} list`,
      detail: `${list.itemCount} items, from ${formatKes(list.requiredTotalCents)}. Orders close ${formatDay(list.orderDeadline)}${left >= 0 ? ` (${plural(left, "day")} left)` : ""}.`,
      action: { label: "View booklist", to: `/parent/lists/${list.id}?student=${c.id}` },
    }]
  }
  return []
}

function TodoRow({ todo }: { todo: Todo }) {
  return (
    <li className="parent-row flex items-center gap-4 rounded-2xl border bg-card p-4">
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5", todo.tone === "warn" ? "bg-warn-bg text-warn-fg" : "bg-teal-light text-accent-text")}>
        {todo.icon}
      </span>
      <span className="flex min-w-0 grow flex-col">
        <span className="text-[16px] font-semibold">{todo.title}</span>
        <span className="text-sm text-muted-foreground">{todo.detail}</span>
      </span>
      <Button asChild className="shrink-0">
        <Link to={todo.action.to}>{todo.action.label} <ArrowRight aria-hidden /></Link>
      </Button>
    </li>
  )
}

function ChildPanel({ child, order }: { child: Child; order: Order | undefined }) {
  const ref = child.latestOrder
  const reached = ref ? (stepReached[ref.status] ?? -1) : -1
  const list = child.openBooklist
  const sent = order?.shipments.filter((s) => s.status === "dispatched" || s.status === "received").length ?? 0
  return (
    <article className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full bg-teal-light font-display text-xl font-semibold text-teal">
          {child.name[0]}
        </span>
        <div className="flex min-w-0 grow flex-col">
          <span className="text-lg font-semibold">{child.name}</span>
          <span className="truncate text-sm text-muted-foreground">{child.className} · {child.schoolName}</span>
        </div>
        {ref ? <OrderStatusBadge status={ref.status} /> : list ? <Badge variant="warning">List ready</Badge> : <Badge variant="secondary">No list yet</Badge>}
      </div>

      <ol className="grid grid-cols-4 gap-1.5" aria-label={`${child.name}'s progress`}>
        {steps.map((s, i) => (
          <li key={s} className="flex flex-col gap-1.5">
            <span className={cn("h-1.5 rounded-full", i <= reached ? "bg-primary" : "bg-secondary")} />
            <span className={cn("text-xs", i <= reached ? "font-semibold text-ink" : "text-muted-foreground")}>
              {s}
              <span className="sr-only">{i <= reached ? " (done)" : " (not yet)"}</span>
            </span>
          </li>
        ))}
      </ol>

      <dl className="grid grid-cols-[repeat(auto-fit,minmax(105px,1fr))] gap-x-4 gap-y-2.5 text-sm">
        {order ? (
          <>
            <Fact label="Order" value={order.number} />
            <Fact label="Total" value={formatKes(order.totalCents)} />
            <Fact label="Publishers sent" value={`${sent} of ${order.shipments.length}`} />
            <Fact label="At school by" value={order.expectedAtSchool ? formatDay(order.expectedAtSchool) : "—"} />
          </>
        ) : list ? (
          <>
            <Fact label="Booklist" value={`${list.gradeName}, ${list.itemCount} items`} />
            <Fact label="Required items" value={formatKes(list.requiredTotalCents)} />
            <Fact label="Order by" value={formatDay(list.orderDeadline)} />
            <Fact label="At school by" value={formatDay(list.deliverBy)} />
          </>
        ) : (
          <Fact label="Booklist" value="The school hasn't published one yet" />
        )}
      </dl>

      <div className="mt-auto flex gap-2.5">
        {order ? (
          <Button asChild variant="outline" className="grow">
            <Link to={`/parent/orders/${order.id}`}>Track order</Link>
          </Button>
        ) : list ? (
          <Button asChild className="grow">
            <Link to={`/parent/lists/${list.id}?student=${child.id}`}>View booklist <ArrowRight aria-hidden /></Link>
          </Button>
        ) : null}
      </div>
    </article>
  )
}

function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return <h2 id={id} className="font-display text-xl font-semibold">{children}</h2>
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  )
}

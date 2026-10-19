import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { ChevronRight } from "lucide-react"

import { OrderStatusBadge } from "@/components/common/StatusBadge"
import { QueryBoundary } from "@/components/common/QueryBoundary"
import { listOrders } from "@/lib/api/endpoints"
import { queryKeys } from "@/lib/api/queries"
import { formatKes } from "@/lib/format"

export function OrdersPage() {
  const orders = useQuery({ queryKey: queryKeys.orders, queryFn: listOrders })
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-semibold">Orders</h1>
      <QueryBoundary query={orders}>
        {(data) =>
          data.results.length ? (
            <ul className="flex flex-col gap-2">
              {data.results.map((o) => (
                <li key={o.id}>
                  <Link to={`/parent/orders/${o.id}`} className="parent-row flex items-center gap-3 rounded-xl border bg-card p-3.5">
                    <span className="flex min-w-0 grow flex-col gap-0.5">
                      <span className="font-semibold">#{o.number} · {o.studentName}</span>
                      <span className="text-sm text-muted-foreground">{o.schoolName} · {formatKes(o.totalCents)}</span>
                    </span>
                    <OrderStatusBadge status={o.status} />
                    <ChevronRight className="size-4.5 shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No orders yet.</p>
          )
        }
      </QueryBoundary>
    </div>
  )
}

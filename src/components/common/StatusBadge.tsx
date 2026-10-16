import { Badge } from "@/components/ui/badge"
import type { OrderStatus } from "@/lib/api/schemas"

type Variant = "info" | "warning" | "success" | "secondary" | "destructive"

const orderStatus: Record<OrderStatus, [label: string, variant: Variant]> = {
  pending_payment: ["Awaiting payment", "warning"],
  payment_failed: ["Payment failed", "warning"],
  paid: ["Paid", "info"],
  in_fulfilment: ["On the way", "info"],
  at_school: ["At school", "success"],
  collected: ["Collected", "secondary"],
  cancelled: ["Cancelled", "secondary"],
  partially_refunded: ["Part refunded", "secondary"],
  refunded: ["Refunded", "secondary"],
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const [label, variant] = orderStatus[status]
  return <Badge variant={variant}>{label}</Badge>
}

const shipment: Record<string, [string, Variant]> = {
  collecting: ["Collecting", "secondary"],
  ready_to_pack: ["Ready to pack", "warning"],
  dispatched: ["Dispatched", "info"],
  received: ["Received", "success"],
}

export function ShipmentStatusBadge({ status }: { status: keyof typeof shipment }) {
  const [label, variant] = shipment[status]
  return <Badge variant={variant}>{label}</Badge>
}

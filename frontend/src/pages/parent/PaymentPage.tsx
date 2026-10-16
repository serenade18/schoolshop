import { Link, useNavigate, useParams } from "react-router"
import { AlertCircle, Check, Smartphone } from "lucide-react"

import { CheckoutSteps } from "@/components/common/CheckoutSteps"
import { GradientBar } from "@/components/common/GradientBar"
import { QueryBoundary } from "@/components/common/QueryBoundary"
import { SectionLabel } from "@/components/common/SectionLabel"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useOrder, usePaymentStatus, useStartPayment } from "@/lib/api/queries"
import type { Order, Payment } from "@/lib/api/schemas"
import { formatDay, formatKes, maskPhone } from "@/lib/format"

const failureCopy: Record<NonNullable<Payment["failureReason"]>, [string, string]> = {
  timeout: ["The prompt timed out", "We didn't hear back from M-Pesa in time. Check your phone is on and has signal, then try again."],
  cancelled: ["Payment was cancelled", "The M-Pesa prompt was closed before the PIN was entered."],
  insufficient_funds: ["Not enough M-Pesa balance", "M-Pesa declined the payment. Top up and try again."],
}

export function PaymentPage() {
  const { orderId = "", paymentId = "" } = useParams()
  const payment = usePaymentStatus(paymentId)
  const order = useOrder(orderId)

  return (
    <QueryBoundary query={payment}>
      {(p) =>
        p.status === "succeeded" ? (
          <QueryBoundary query={order}>{(o) => <Paid order={o} />}</QueryBoundary>
        ) : p.status === "failed" ? (
          <Failed payment={p} />
        ) : (
          <Waiting payment={p} />
        )
      }
    </QueryBoundary>
  )
}

function useRetry(payment: Payment) {
  const navigate = useNavigate()
  const start = useStartPayment()
  return {
    pending: start.isPending,
    retry: () =>
      start.mutate(
        { orderId: payment.orderId, phone: payment.phone ?? "" },
        { onSuccess: (next) => navigate(`/parent/orders/${payment.orderId}/payments/${next.id}`, { replace: true }) }
      ),
  }
}

function Waiting({ payment }: { payment: Payment }) {
  const { retry, pending } = useRetry(payment)
  return (
    <div className="flex flex-col items-center gap-5 pt-8 text-center">
      <span aria-hidden className="flex size-24 items-center justify-center rounded-full bg-warn-bg">
        <Smartphone className="size-11 text-accent-text" strokeWidth={1.8} />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-tight font-semibold">Check your phone</h1>
        <p className="text-ink/85">
          We sent an M-Pesa prompt to {payment.phone ? maskPhone(payment.phone) : "your phone"}.
        </p>
      </div>
      <div role="status" className="flex w-full flex-col gap-2">
        <GradientBar value={0.55} label="Waiting for M-Pesa" />
        <span className="text-sm text-muted-foreground">Waiting for M-Pesa… the prompt expires in about a minute</span>
      </div>
      <ol className="flex w-full list-decimal flex-col gap-2 rounded-xl bg-surface py-4.5 pr-4.5 pl-10 text-left text-[15px] leading-snug">
        <li>Unlock your phone</li>
        <li>
          Check the M-Pesa pop-up: <strong>SchoolShop, {formatKes(payment.amountCents)}</strong>
        </li>
        <li>Enter your M-Pesa PIN and press OK</li>
      </ol>
      <Button variant="outline" size="lg" className="w-full" onClick={retry} disabled={pending}>
        Resend the prompt
      </Button>
    </div>
  )
}

function Failed({ payment }: { payment: Payment }) {
  const { retry, pending } = useRetry(payment)
  const [title, body] = failureCopy[payment.failureReason ?? "timeout"]
  return (
    <div className="flex flex-col items-center gap-4.5 pt-8 text-center">
      <span aria-hidden className="flex size-22 items-center justify-center rounded-full bg-warn-bg">
        <AlertCircle className="size-10 text-warn-fg" />
      </span>
      <h1 className="text-[28px] leading-tight font-semibold">{title}</h1>
      <p className="text-ink/85">{body}</p>
      <p className="flex w-full items-start gap-2.5 rounded-xl bg-surface p-3.5 text-left text-sm text-ink/85">
        <Check className="mt-0.5 size-4.5 shrink-0" aria-hidden />
        No money was taken. Your order is saved until the school's deadline.
      </p>
      <Button size="lg" className="w-full" onClick={retry} disabled={pending}>
        Send the M-Pesa prompt again
      </Button>
      <Button asChild variant="link">
        <Link to="/parent">Back to home</Link>
      </Button>
    </div>
  )
}

function Paid({ order }: { order: Order }) {
  const items = order.items.reduce((n, i) => n + i.qty, 0)
  const publishers = new Set(order.items.map((i) => i.publisherName)).size
  return (
    <div className="flex flex-col gap-4">
      <CheckoutSteps current={2} />
      <div className="flex flex-col items-center gap-2.5 pt-2 text-center">
        <span aria-hidden className="flex size-18 items-center justify-center rounded-full bg-ink">
          <Check className="size-8 text-sun" strokeWidth={2.6} />
        </span>
        <h1 className="text-[28px] font-semibold">You're all set</h1>
        <p className="text-[15px] text-ink/85">Order #{order.number} is paid. We've sent the receipt by SMS.</p>
      </div>

      {order.collectionCode && (
        <section aria-label="Collection code" className="flex flex-col gap-1 rounded-2xl bg-ink p-4.5 text-white">
          <SectionLabel as="span" className="text-sun">{order.studentName}'s collection code</SectionLabel>
          <span className="font-display text-[40px] font-semibold tracking-[0.18em]">{order.collectionCode}</span>
          <span className="text-sm leading-snug text-white/80">
            The class teacher asks for this code when handing out the pack.
          </span>
        </section>
      )}

      <dl aria-label="Receipt" className="flex flex-col gap-2.5 rounded-2xl border bg-card p-4 text-[15px]">
        <div className="flex justify-between"><dt className="text-muted-foreground">M-Pesa ref</dt><dd className="font-semibold">{order.mpesaReceipt}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Items</dt><dd>{items} items · {publishers} publishers</dd></div>
        <Separator />
        <div className="flex justify-between font-bold"><dt>Total paid</dt><dd>{formatKes(order.totalCents)}</dd></div>
      </dl>

      {order.expectedAtSchool && (
        <p className="px-1 text-[15px]">
          <span className="font-bold text-accent-text">{formatDay(order.expectedAtSchool)}</span>: pack arrives at{" "}
          {order.schoolName}. We'll send you an SMS.
        </p>
      )}

      <Button asChild size="lg">
        <Link to={`/parent/orders/${order.id}`}>Track this order</Link>
      </Button>
    </div>
  )
}

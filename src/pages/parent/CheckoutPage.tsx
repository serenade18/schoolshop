import { Link, useNavigate } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Lock, Minus, Plus, School } from "lucide-react"
import { z } from "zod"

import { CheckoutSteps } from "@/components/common/CheckoutSteps"
import { QueryBoundary } from "@/components/common/QueryBoundary"
import { SectionLabel } from "@/components/common/SectionLabel"
import { ParentPageHeader } from "@/components/layout/ParentLayout"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ApiError } from "@/lib/api/client"
import { useBooklist, useChildren, useCreateOrder, useProducts, useStartPayment } from "@/lib/api/queries"
import type { Booklist, Product } from "@/lib/api/schemas"
import { formatDay, formatKes, normaliseKenyanPhone } from "@/lib/format"
import { useAuthStore } from "@/stores/auth"
import { useCartStore } from "@/stores/cart"

const payFormSchema = z.object({
  phone: z
    .string()
    .trim()
    .refine((v) => normaliseKenyanPhone(v) !== null, "Enter the M-Pesa number, like 0712 345 678"),
})
type PayForm = z.infer<typeof payFormSchema>

export function CheckoutPage() {
  const { booklistId } = useCartStore()
  const booklist = useBooklist(booklistId)

  if (!booklistId) {
    return (
      <>
        <ParentPageHeader back="/parent" title="Checkout" />
        <div className="flex flex-col items-start gap-3 rounded-2xl border bg-card p-5">
          <p className="font-semibold">Your cart is empty</p>
          <p className="text-sm text-muted-foreground">Open your child's school list to start an order.</p>
          <Button asChild>
            <Link to="/parent">Go to my children</Link>
          </Button>
        </div>
      </>
    )
  }

  return <QueryBoundary query={booklist}>{(list) => <Checkout list={list} />}</QueryBoundary>
}

function Checkout({ list }: { list: Booklist }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const cart = useCartStore()
  const children = useChildren()
  const products = useProducts()
  const createOrder = useCreateOrder()
  const startPayment = useStartPayment()

  const child = children.data?.find((c) => c.id === cart.studentId)
  const listLines = list.items.filter((i) => !cart.excludedItemIds.includes(i.id))
  const listTotal = listLines.reduce((s, i) => s + i.unitPriceCents * i.qtyPerStudent, 0)
  const extras = Object.entries(cart.extras).flatMap(([id, qty]) => {
    const p = products.data?.results.find((x) => x.id === id)
    return p ? [{ product: p, qty }] : []
  })
  const extrasTotal = extras.reduce((s, e) => s + e.product.priceCents * e.qty, 0)
  const total = listTotal + extrasTotal

  const form = useForm<PayForm>({
    resolver: zodResolver(payFormSchema),
    defaultValues: { phone: user?.phone ? user.phone.replace(/^254/, "0") : "" },
  })
  const busy = createOrder.isPending || startPayment.isPending

  async function onSubmit({ phone }: PayForm) {
    if (!cart.studentId || !cart.booklistId) return
    try {
      const order = await createOrder.mutateAsync({
        studentId: cart.studentId,
        booklistId: cart.booklistId,
        excludedItemIds: cart.excludedItemIds,
        extraItems: extras.map((e) => ({ productId: e.product.id, qty: e.qty })),
      })
      const payment = await startPayment.mutateAsync({ orderId: order.id, phone: normaliseKenyanPhone(phone)! })
      cart.clear()
      navigate(`/parent/orders/${order.id}/payments/${payment.id}`, { replace: true })
    } catch (e) {
      const err = e instanceof ApiError ? e : null
      form.setError(err?.fieldErrors.phone ? "phone" : "root", {
        message: err?.fieldErrors.phone?.[0] ?? err?.message ?? "Couldn't start the payment. Try again.",
      })
    }
  }

  return (
    <>
      <ParentPageHeader back={`/parent/lists/${list.id}?student=${cart.studentId}`} title="Checkout" />
      <CheckoutSteps current={1} />
      <div className="parent-split mt-5 flex flex-col gap-3.5">
        <div className="parent-col flex flex-col gap-3.5" style={{ "--col-gap": "14px" } as React.CSSProperties}>
        <section aria-label="School list" className="flex flex-col gap-2.5 rounded-2xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="flex flex-col gap-0.5">
              <SectionLabel as="span" className="text-xs">
                For {child?.name ?? "your child"} · {child?.className ?? list.gradeName}
              </SectionLabel>
              <span className="font-semibold">{list.termName.split(",")[0]} school list</span>
              <span className="text-sm text-muted-foreground">
                {listLines.length} of {list.items.length} items
              </span>
            </span>
            <span className="font-bold whitespace-nowrap">{formatKes(listTotal)}</span>
          </div>
          <Link
            to={`/parent/lists/${list.id}?student=${cart.studentId}`}
            className="self-start py-1 text-sm font-semibold text-accent-text hover:underline"
          >
            Change items
          </Link>
        </section>

        {extras.length > 0 && (
          <section aria-label="Extra shop items" className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
            <SectionLabel as="span" className="text-xs">Extra from the shop</SectionLabel>
            {extras.map(({ product, qty }) => (
              <ExtraRow key={product.id} product={product} qty={qty} onChange={(n) => cart.setExtraQty(product.id, n)} />
            ))}
          </section>
        )}

        <section aria-label="Delivery" className="flex items-start gap-3 rounded-2xl border bg-card p-4">
          <School className="mt-0.5 size-5.5 shrink-0" aria-hidden />
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold">Delivered to {list.schoolName}</span>
            <span className="text-sm leading-snug text-muted-foreground">
              Everything arrives together in one labelled pack, by {formatDay(list.deliverBy)}.
            </span>
          </span>
        </section>

        </div>

        <div className="parent-col parent-col--sticky flex flex-col gap-3.5" style={{ "--col-gap": "14px" } as React.CSSProperties}>
        <dl className="flex flex-col gap-2 px-1 text-[15px]">
          <div className="flex justify-between"><dt className="text-muted-foreground">School list</dt><dd>{formatKes(listTotal)}</dd></div>
          {extras.length > 0 && (
            <div className="flex justify-between"><dt className="text-muted-foreground">Shop items</dt><dd>{formatKes(extrasTotal)}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-muted-foreground">Delivery to school</dt><dd className="font-semibold text-success-fg">Free</dd></div>
          <Separator className="my-1" />
          <div className="flex justify-between text-[17px] font-bold"><dt>Total</dt><dd>{formatKes(total)}</dd></div>
        </dl>

        <Form {...form}>
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3.5 rounded-2xl border bg-card p-4">
            <SectionLabel as="span" className="text-xs">Pay with M-Pesa</SectionLabel>
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>M-Pesa phone number</FormLabel>
                  <FormControl>
                    <Input type="tel" inputMode="tel" autoComplete="tel" {...field} />
                  </FormControl>
                  <FormDescription>We'll send a payment prompt to this number.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p role="alert" className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
            )}
            <Button type="submit" size="lg" disabled={busy || listLines.length + extras.length === 0}>
              {busy ? "Sending prompt…" : `Pay ${formatKes(total)} with M-Pesa`}
            </Button>
            <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Lock className="size-3.5" aria-hidden /> Full refund for any item the publisher can't supply.
            </p>
          </form>
        </Form>
        </div>
      </div>
    </>
  )
}

function ExtraRow({ product, qty, onChange }: { product: Product; qty: number; onChange: (qty: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex min-w-0 grow flex-col">
        <span className="text-[15px] font-semibold">{product.title}</span>
        <span className="text-sm text-muted-foreground">{formatKes(product.priceCents)}</span>
      </span>
      <div role="group" aria-label={`Quantity of ${product.title}`} className="flex h-11 items-center rounded-lg border border-input">
        <button type="button" aria-label="Decrease" onClick={() => onChange(qty - 1)} className="flex h-full w-9 items-center justify-center">
          <Minus className="size-4" aria-hidden />
        </button>
        <span className="min-w-5 text-center font-bold" aria-live="polite">{qty}</span>
        <button type="button" aria-label="Increase" onClick={() => onChange(qty + 1)} className="flex h-full w-9 items-center justify-center">
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}

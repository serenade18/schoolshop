import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "react-router"
import { ArrowRight, Plus, School, Trash2 } from "lucide-react"
import { z } from "zod"

import { OrderStatusBadge } from "@/components/common/StatusBadge"
import { QueryBoundary } from "@/components/common/QueryBoundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { ApiError } from "@/lib/api/client"
import { useAddChild, useChildren, useRemoveChild } from "@/lib/api/queries"
import type { Child } from "@/lib/api/schemas"
import { formatDay, formatKes } from "@/lib/format"

export function ChildrenPage() {
  const children = useChildren()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] leading-tight font-semibold">Children</h1>
          <p className="text-[15px] text-muted-foreground">Each child's school list shows up here once you link them.</p>
        </div>
        {!adding && <Button onClick={() => { setAdding(true); setAdded(null) }}><Plus aria-hidden /> Add a child</Button>}
      </div>

      {adding && <AddChildForm onDone={(name) => { setAdding(false); setAdded(name) }} onCancel={() => setAdding(false)} />}
      {added && <p role="status" className="rounded-2xl bg-success-bg p-4 text-[15px] text-success-fg">{added} is linked. Their school list is below.</p>}

      <QueryBoundary query={children}>
        {(list) =>
          list.length ? (
            <ul className="grid gap-3 lg:grid-cols-2">{list.map((c) => <ChildCard key={c.id} child={c} />)}</ul>
          ) : (
            <p className="rounded-2xl border border-dashed bg-card px-5 py-10 text-center text-muted-foreground">No children yet. Add one with the code from their school.</p>
          )
        }
      </QueryBoundary>

      <section className="flex items-start gap-3 rounded-2xl bg-teal-light p-4.5">
        <School className="mt-0.5 size-5 shrink-0 text-accent-text" aria-hidden />
        <p className="text-sm leading-snug text-ink-2">
          <span className="font-semibold text-ink">Where's the school code?</span> Schools on SchoolShop send it to parents by SMS or on the term letter. The admission number is on your child's report card or fees receipt.
        </p>
      </section>
    </div>
  )
}

function ChildCard({ child }: { child: Child }) {
  const remove = useRemoveChild()
  const list = child.openBooklist
  const order = child.latestOrder
  return (
    <li className="flex flex-col gap-4 rounded-2xl border bg-card p-4.5">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full bg-teal-light font-display text-xl font-semibold text-teal">{child.name[0]}</span>
        <span className="flex min-w-0 grow flex-col">
          <span className="text-lg font-semibold">{child.name}</span>
          <span className="text-sm text-muted-foreground">{child.className} · {child.schoolName}</span>
        </span>
        {order ? <OrderStatusBadge status={order.status} /> : list ? <Badge variant="warning">List ready</Badge> : <Badge variant="secondary">No list yet</Badge>}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
        <div className="flex flex-col gap-0.5"><dt className="text-muted-foreground">Admission no.</dt><dd className="font-semibold">{child.admissionNo}</dd></div>
        <div className="flex flex-col gap-0.5"><dt className="text-muted-foreground">Grade</dt><dd className="font-semibold">{child.gradeName}</dd></div>
        {list && !order && (
          <>
            <div className="flex flex-col gap-0.5"><dt className="text-muted-foreground">Required items</dt><dd className="font-semibold">{formatKes(list.requiredTotalCents)}</dd></div>
            <div className="flex flex-col gap-0.5"><dt className="text-muted-foreground">Order by</dt><dd className="font-semibold">{formatDay(list.orderDeadline)}</dd></div>
          </>
        )}
        {order && (
          <div className="col-span-2 flex flex-col gap-0.5"><dt className="text-muted-foreground">This term's order</dt><dd className="font-semibold">{order.number}{order.expectedAtSchool && `, at school by ${formatDay(order.expectedAtSchool)}`}</dd></div>
        )}
      </dl>
      {remove.error && <p role="alert" className="text-sm text-destructive">{remove.error.message}</p>}
      <div className="mt-auto flex flex-wrap gap-2.5">
        {order ? (
          <Button asChild variant="outline" className="grow"><Link to={`/parent/orders/${order.id}`}>Track order</Link></Button>
        ) : list ? (
          <Button asChild className="grow"><Link to={`/parent/lists/${list.id}?student=${child.id}`}>View booklist <ArrowRight aria-hidden /></Link></Button>
        ) : (
          <span className="grow self-center text-sm text-muted-foreground">We'll SMS you when {child.schoolName} publishes the {child.gradeName} list.</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove ${child.name}`}
          disabled={remove.isPending}
          onClick={() => window.confirm(`Remove ${child.name} from your account? You can add them again with the school code.`) && remove.mutate(child.id)}
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
    </li>
  )
}

const addSchema = z.object({
  schoolCode: z.string().trim().min(4, "Enter the school code"),
  admissionNo: z.string().trim().min(3, "Enter the admission number"),
  name: z.string().trim().min(2, "Enter your child's first name"),
})
type AddValues = z.infer<typeof addSchema>

function AddChildForm({ onDone, onCancel }: { onDone: (name: string) => void; onCancel: () => void }) {
  const form = useForm<AddValues>({ resolver: zodResolver(addSchema), defaultValues: { schoolCode: "", admissionNo: "", name: "" } })
  const add = useAddChild()
  return (
    <Form {...form}>
      <form
        noValidate
        className="flex flex-col gap-4 rounded-2xl border-2 border-primary/30 bg-card p-4.5"
        onSubmit={form.handleSubmit((v) =>
          add.mutate(v, {
            onSuccess: (c) => onDone(c.name),
            onError: (e) => {
              const f = e instanceof ApiError ? e.fieldErrors : {}
              const field = (["schoolCode", "admissionNo", "name"] as const).find((k) => f[k])
              form.setError(field ?? "root", { message: field ? f[field][0] : e.message })
            },
          })
        )}
      >
        <h2 className="font-display text-lg font-semibold">Add a child</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="schoolCode" render={({ field }) => (
            <FormItem><FormLabel>School code</FormLabel><FormControl><Input placeholder="GRN-2027" autoCapitalize="characters" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="admissionNo" render={({ field }) => (
            <FormItem><FormLabel>Admission number</FormLabel><FormControl><Input autoCapitalize="characters" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>First name</FormLabel><FormControl><Input autoComplete="off" {...field} /></FormControl><FormDescription>What you call them.</FormDescription><FormMessage /></FormItem>
          )} />
        </div>
        {import.meta.env.VITE_USE_MOCKS === "true" && (
          <p className="rounded-xl bg-paper px-3.5 py-2.5 text-[13px] text-muted-foreground">Demo: school code <span className="font-mono font-semibold text-ink">GRN-2027</span>, admission number <span className="font-mono font-semibold text-ink">GH/2025/0001</span>.</p>
        )}
        {form.formState.errors.root && <p role="alert" className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={add.isPending}>{add.isPending ? "Checking…" : "Link child"}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Form>
  )
}

import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"

import type { Order, Payment } from "@/lib/api/schemas"
import * as db from "@/mocks/fixtures"

/*
 * In-browser stand-in for the DRF API (VITE_USE_MOCKS=true). It follows the
 * same URLs, status codes and error shapes the backend will use, so switching
 * to the real API is a config change.
 *
 * Mock-only behaviour:
 *   - the one-time code is 123456 for every demo phone number;
 *   - an M-Pesa number ending in 000 fails with "insufficient funds";
 *   - a payment succeeds on the second status check (~4 s of polling).
 */

type Ctx = { params: Record<string, string>; query: Record<string, string>; body: Record<string, unknown> }
type Handler = (ctx: Ctx) => unknown

const orders = new Map(db.orders.map((o) => [o.id, structuredClone(o)]))
const payments = new Map<string, Payment & { checks: number }>()
let orderSeq = 20430

class HttpError extends Error {
  status: number
  data: unknown
  constructor(status: number, data: unknown) {
    super(`HTTP ${status}`)
    this.status = status
    this.data = data
  }
}
const notFound = () => new HttpError(404, { detail: "Not found." })

const routes: Array<[method: string, pattern: string, handler: Handler]> = [
  ["post", "/auth/otp/request/", ({ body }) => {
    if (!db.demoUsers[String(body.phone)]) throw new HttpError(400, { phone: ["No SchoolShop account uses this number yet."] })
    return { sent: true }
  }],
  ["post", "/auth/otp/verify/", ({ body }) => {
    const user = db.demoUsers[String(body.phone)]
    if (!user || body.code !== "123456") throw new HttpError(400, { code: ["That code is wrong or has expired."] })
    return { access: `mock-access-${user.id}`, refresh: `mock-refresh-${user.id}`, user }
  }],

  ["get", "/schools/", ({ query }) => {
    const q = (query.search ?? "").toLowerCase()
    const results = db.schools.filter((s) => `${s.name} ${s.town}`.toLowerCase().includes(q))
    return { count: results.length, next: null, previous: null, results }
  }],
  ["get", "/schools/:slug/", ({ params }) => db.schools.find((s) => s.slug === params.slug) ?? raise(notFound())],
  ["get", "/schools/:slug/booklists/", ({ params }) => {
    const school = db.schools.find((s) => s.slug === params.slug) ?? raise(notFound())
    return db.booklists.filter((b) => b.schoolId === school.id && b.status === "published")
  }],
  ["get", "/products/", ({ query }) => {
    const band = query.gradeBand
    const results = db.products.filter((p) => !band || band === "all" || p.gradeBand === band || p.gradeBand === "all")
    return { count: results.length, next: null, previous: null, results }
  }],
  ["get", "/products/:id/", ({ params }) => db.products.find((p) => p.id === params.id) ?? raise(notFound())],

  ["get", "/children/", () => db.children.map((c) => {
    const latest = [...orders.values()].filter((o) => o.studentName === c.name).at(-1)
    return latest
      ? { ...c, openBooklist: latest.status === "pending_payment" ? c.openBooklist : null, latestOrder: { id: latest.id, number: latest.number, status: latest.status, expectedAtSchool: latest.expectedAtSchool } }
      : c
  })],
  ["get", "/booklists/:id/", ({ params }) => db.booklists.find((b) => b.id === params.id) ?? raise(notFound())],
  ["get", "/orders/", () => {
    const results = [...orders.values()].reverse()
    return { count: results.length, next: null, previous: null, results }
  }],
  ["post", "/orders/", ({ body }) => {
    const child = db.children.find((c) => c.id === body.studentId)
    const list = db.booklists.find((b) => b.id === body.booklistId)
    if (!child || !list) throw new HttpError(400, { nonFieldErrors: ["This list is no longer open for orders."] })
    const excluded = new Set((body.excludedItemIds as string[]) ?? [])
    const extras = ((body.extraItems as { productId: string; qty: number }[]) ?? []).flatMap(({ productId, qty }) => {
      const p = db.products.find((x) => x.id === productId)
      return p ? [{ id: `x-${p.id}`, title: p.title, publisherName: p.publisherName, unitPriceCents: p.priceCents, qtyPerStudent: qty }] : []
    })
    const lines = [...list.items.filter((i) => !excluded.has(i.id)), ...extras]
    if (!lines.length) throw new HttpError(400, { nonFieldErrors: ["Choose at least one item."] })
    const subtotal = lines.reduce((s, i) => s + i.unitPriceCents * i.qtyPerStudent, 0)
    const id = `ord-${++orderSeq}`
    const publishers = [...new Set(lines.map((l) => l.publisherName))]
    const order: Order = {
      id,
      number: `SS-${orderSeq}`,
      status: "pending_payment",
      studentName: child.name,
      schoolName: child.schoolName,
      className: child.className,
      subtotalCents: subtotal,
      totalCents: subtotal,
      collectionCode: null,
      paidAt: null,
      mpesaReceipt: null,
      expectedAtSchool: list.deliverBy,
      collectedAt: null,
      items: lines.map((l) => ({ id: `oi-${l.id}`, title: l.title, publisherName: l.publisherName, qty: l.qtyPerStudent, unitPriceCents: l.unitPriceCents, status: "active" })),
      shipments: publishers.map((p) => ({ publisherName: p, summary: plural(lines.filter((l) => l.publisherName === p).length, "item"), status: "collecting" })),
    }
    orders.set(id, order)
    return order
  }],
  ["get", "/orders/:id/", ({ params }) => orders.get(params.id) ?? raise(notFound())],
  ["post", "/orders/:id/payments/", ({ params, body }) => {
    const order = orders.get(params.id) ?? raise(notFound())
    if (order.status !== "pending_payment" && order.status !== "payment_failed") throw new HttpError(409, { detail: "This order is already paid." })
    const phone = String(body.phone ?? "")
    if (!/^2547\d{8}$|^2541\d{8}$/.test(phone)) throw new HttpError(400, { phone: ["Enter a Safaricom number like 0712 345 678."] })
    const payment = { id: `pay-${Date.now()}`, orderId: order.id, method: "mpesa" as const, status: "initiated" as const, amountCents: order.totalCents, phone, failureReason: null, checks: 0 }
    payments.set(payment.id, payment)
    order.status = "pending_payment"
    return strip(payment)
  }],
  ["get", "/payments/:id/", ({ params }) => {
    const p = payments.get(params.id) ?? raise(notFound())
    p.checks += 1
    if (p.status === "initiated" && p.checks >= 2) {
      const order = orders.get(p.orderId)!
      if (p.phone?.endsWith("000")) {
        Object.assign(p, { status: "failed", failureReason: "insufficient_funds" })
        order.status = "payment_failed"
      } else {
        p.status = "succeeded"
        Object.assign(order, {
          status: "paid",
          paidAt: new Date().toISOString().replace("Z", "+00:00"),
          mpesaReceipt: "QK" + Math.random().toString(36).slice(2, 10).toUpperCase(),
          collectionCode: String(1000 + Math.floor(Math.random() * 9000)),
        })
      }
    }
    return strip(p)
  }],

  ["get", "/school/overview/", () => db.schoolOverview],
  ["get", "/school/booklists/", () => db.booklists.map(db.summarise)],
  ["get", "/publisher/batches/", () => db.publisherBatches],
  ["get", "/admin/overview/", () => db.adminOverview],
]

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

function raise(error: Error): never {
  throw error
}

function strip({ checks: _checks, ...payment }: Payment & { checks: number }): Payment {
  return payment
}

function match(pattern: string, path: string) {
  const a = pattern.split("/")
  const b = path.split("/")
  if (a.length !== b.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(":")) params[a[i].slice(1)] = decodeURIComponent(b[i])
    else if (a[i] !== b[i]) return null
  }
  return params
}

export const mockAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  await new Promise((r) => setTimeout(r, 250 + Math.random() * 250))
  const url = new URL(config.url ?? "", "http://mock")
  const method = (config.method ?? "get").toLowerCase()
  const query: Record<string, string> = Object.fromEntries(url.searchParams)
  for (const [key, value] of Object.entries(config.params ?? {})) if (value != null) query[key] = String(value)
  const body = typeof config.data === "string" && config.data ? JSON.parse(config.data) : (config.data ?? {})

  const respond = (status: number, data: unknown): AxiosResponse => ({ data, status, statusText: String(status), headers: {}, config })

  for (const [m, pattern, handler] of routes) {
    if (m !== method) continue
    const params = match(pattern, url.pathname)
    if (!params) continue
    try {
      const created = method === "post" && !pattern.startsWith("/auth/")
      return respond(created ? 201 : 200, structuredClone(handler({ params, query, body })))
    } catch (e) {
      if (e instanceof HttpError) {
        throw new AxiosError(e.message, String(e.status), config, null, respond(e.status, e.data))
      }
      throw e
    }
  }
  const missing = respond(404, { detail: `No mock for ${method.toUpperCase()} ${url.pathname}` })
  throw new AxiosError("Not found", "404", config, null, missing)
}

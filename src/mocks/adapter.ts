import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"

import type { Booklist, CatalogItem, CollectionRow, Order, Payment, PublisherPayouts, SchoolOrderDetail, SchoolStaffRole } from "@/lib/api/schemas"
import * as db from "@/mocks/fixtures"

/*
 * In-browser stand-in for the DRF API (VITE_USE_MOCKS=true). It follows the
 * same URLs, status codes and error shapes the backend will use, so switching
 * to the real API is a config change.
 *
 * Mock-only behaviour:
 *   - the one-time code is 123456 and demo accounts use the password "schoolshop1";
 *   - an M-Pesa number ending in 000 fails with "insufficient funds";
 *   - a payment succeeds on the second status check (~4 s of polling).
 */

/** userId comes from the mock bearer token ("mock-access-<userId>"). */
type Ctx = { params: Record<string, string>; query: Record<string, string>; body: Record<string, unknown>; userId: string | null }
type Handler = (ctx: Ctx) => unknown

const DEMO_CODE = "123456"
const passwords = new Map(Object.keys(db.demoUsers).map((phone) => [phone, "schoolshop1"]))
const pendingSignups = new Map<string, { name: string; password: string }>()
let userSeq = 100

const maskPhone = (e164: string) => { const l = e164.replace(/^254/, "0"); return `${l.slice(0, 4)} ••• ${l.slice(-3)}` }
const maskEmail = (email: string) => email.replace(/^(.)[^@]*/, "$1•••")
const findUser = (identifier: string) =>
  db.demoUsers[identifier] ?? Object.values(db.demoUsers).find((u) => u.email && u.email.toLowerCase() === identifier.toLowerCase())
const tokensFor = (user: (typeof db.demoUsers)[string]) => ({ access: `mock-access-${user.id}`, refresh: `mock-refresh-${user.id}`, user })

const batches = new Map(db.publisherBatches.map((b) => [b.id, structuredClone(b)]))
let deliveryNoteSeq = 1042

const payouts = structuredClone(db.publisherPayouts)
const settings = structuredClone(db.publisherSettings)
let teamSeq = 10
const findTeam = (id: string) => settings.team.find((m) => m.id === id) ?? raise(notFound())
const admins = () => settings.team.filter((m) => m.role === "admin" && m.status === "active")

const catalog = new Map(db.publisherCatalog.map((c) => [c.id, structuredClone(c)]))
let catalogSeq = 100

const booklists = new Map(db.booklists.map((b) => [b.id, structuredClone(b)]))
const catalogById = new Map(db.schoolCatalog.map((c) => [c.productId, c]))
const isoDay = /^\d{4}-\d{2}-\d{2}$/
/** Check a list's dates and items; `forPublish` adds the rules parents depend on. */
function checkBooklist(list: Booklist, forPublish: boolean) {
  const errors: Record<string, string[]> = {}
  if (!isoDay.test(list.orderDeadline)) errors.orderDeadline = ["Choose the last day parents can order."]
  if (!isoDay.test(list.deliverBy)) errors.deliverBy = ["Choose when packs must be at school."]
  else if (list.deliverBy <= list.orderDeadline) errors.deliverBy = ["Give publishers time to pack: this must be after the order deadline."]
  if (forPublish && !list.items.some((i) => i.required)) errors.items = ["Mark at least one item as required before publishing."]
  if (Object.keys(errors).length) throw new HttpError(400, errors)
}

const schoolSettings = structuredClone(db.schoolSettings)
let staffSeq = 10
const findStaff = (id: string) => schoolSettings.team.find((m) => m.id === id) ?? raise(notFound())
const schoolAdmins = () => schoolSettings.team.filter((m) => m.role === "school_admin" && m.status === "active")
const validClasses = (names: unknown) => {
  const list = Array.isArray(names) ? names.map(String) : []
  const bad = list.find((c) => !schoolSettings.classNames.includes(c))
  if (bad) throw new HttpError(400, { classNames: [`${bad} isn't a class at this school.`] })
  return list
}
/** Wrong-code attempts per class; five in a row locks that class for a minute. */
const codeAttempts = new Map<string, { wrong: number; lockedUntil: number }>()

const schoolRows = db.schoolOrderRows.map((r) => structuredClone(r))
const schoolOrders = new Map(db.schoolOrderDetails.map((o) => [o.id, structuredClone(o)]))
const schoolDeliveries = new Map(db.schoolDeliveries.map((d) => [d.id, structuredClone(d)]))

const orders = new Map(db.orders.map((o) => [o.id, structuredClone(o)]))
const payments = new Map<string, Payment & { checks: number }>()
let orderSeq = 20430

function collectionRow(o: SchoolOrderDetail): CollectionRow {
  const waitingFor = o.shipments.filter((s) => s.status !== "received").map((s) => s.publisherName)
  return {
    orderId: o.id,
    orderNumber: o.number,
    studentName: o.studentName,
    admissionNo: o.admissionNo,
    gradeName: o.className.startsWith("PP") ? o.className.split(" ")[0] : `Grade ${o.className.split(" ")[0]}`,
    className: o.className,
    itemCount: o.items.length,
    status: o.status === "collected" ? "collected" : o.status === "at_school" ? "ready" : "waiting",
    waitingFor: o.status === "in_fulfilment" ? waitingFor : [],
    collectedAt: o.collectedAt,
    parentPhone: o.parentPhone,
  }
}

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
  ["post", "/auth/login/", ({ body }) => {
    const user = findUser(String(body.identifier ?? ""))
    if (!user || passwords.get(user.phone) !== body.password) {
      throw new HttpError(400, { password: ["That password doesn't match this account. Try again or reset it."] })
    }
    return tokensFor(user)
  }],
  ["post", "/auth/otp/request/", ({ body }) => {
    const phone = String(body.phone)
    if (!db.demoUsers[phone]) throw new HttpError(400, { phone: ["No SchoolShop account uses this number yet."] })
    return { sent: true, channel: "sms", destination: maskPhone(phone) }
  }],
  ["post", "/auth/otp/verify/", ({ body }) => {
    const user = db.demoUsers[String(body.phone)]
    if (!user || body.code !== DEMO_CODE) throw new HttpError(400, { code: ["That code is wrong or has expired."] })
    return tokensFor(user)
  }],
  ["post", "/auth/register/", ({ body }) => {
    const phone = String(body.phone ?? "")
    if (db.demoUsers[phone]) throw new HttpError(400, { phone: ["An account already uses this number. Sign in instead."] })
    pendingSignups.set(phone, { name: String(body.name ?? ""), password: String(body.password ?? "") })
    return { sent: true, channel: "sms", destination: maskPhone(phone) }
  }],
  ["post", "/auth/register/resend/", ({ body }) => {
    const phone = String(body.phone ?? "")
    if (!pendingSignups.has(phone)) throw new HttpError(400, { phone: ["Start sign-up again."] })
    return { sent: true, channel: "sms", destination: maskPhone(phone) }
  }],
  ["post", "/auth/register/verify/", ({ body }) => {
    const phone = String(body.phone ?? "")
    const pending = pendingSignups.get(phone)
    if (!pending || body.code !== DEMO_CODE) throw new HttpError(400, { code: ["That code is wrong or has expired."] })
    pendingSignups.delete(phone)
    const created = { id: `usr-${++userSeq}`, name: pending.name, phone, email: null, roles: ["parent" as const], memberships: [] }
    db.demoUsers[phone] = created
    passwords.set(phone, pending.password)
    return tokensFor(created)
  }],
  ["post", "/auth/password/forgot/", ({ body }) => {
    const identifier = String(body.identifier ?? "")
    const user = findUser(identifier)
    if (!user) throw new HttpError(400, { identifier: ["We couldn't find an account with that phone number or email."] })
    return identifier.includes("@")
      ? { sent: true, channel: "email", destination: maskEmail(identifier) }
      : { sent: true, channel: "sms", destination: maskPhone(user.phone) }
  }],
  ["post", "/auth/password/reset/", ({ body }) => {
    const user = findUser(String(body.identifier ?? ""))
    if (!user || body.code !== DEMO_CODE) throw new HttpError(400, { code: ["That code is wrong or has expired."] })
    if (passwords.get(user.phone) === body.password) throw new HttpError(400, { password: ["Choose a password you haven't used before."] })
    passwords.set(user.phone, String(body.password))
    return { reset: true }
  }],
  ["post", "/auth/password/change/", ({ body, userId }) => {
    const user = Object.values(db.demoUsers).find((u) => u.id === userId) ?? raise(new HttpError(401, { detail: "Sign in again." }))
    if (passwords.get(user.phone) !== body.currentPassword) throw new HttpError(400, { currentPassword: ["That isn't your current password."] })
    if (body.currentPassword === body.newPassword) throw new HttpError(400, { newPassword: ["Choose a password you haven't used before."] })
    passwords.set(user.phone, String(body.newPassword))
    return { changed: true }
  }],
  ["post", "/organisations/applications/", ({ body }) => {
    const phone = String(body.phone ?? "")
    if (db.demoUsers[phone]) throw new HttpError(400, { phone: ["An account already uses this number."] })
    return { id: `app-${Date.now()}`, orgType: body.orgType, orgName: body.orgName, status: "pending_review" }
  }],

  ["get", "/schools/", ({ query }) => {
    const q = (query.search ?? "").toLowerCase()
    const results = db.schools.filter((s) => `${s.name} ${s.town}`.toLowerCase().includes(q))
    return { count: results.length, next: null, previous: null, results }
  }],
  ["get", "/schools/:slug/", ({ params }) => db.schools.find((s) => s.slug === params.slug) ?? raise(notFound())],
  ["get", "/schools/:slug/booklists/", ({ params }) => {
    const school = db.schools.find((s) => s.slug === params.slug) ?? raise(notFound())
    return [...booklists.values()].filter((b) => b.schoolId === school.id && b.status === "published")
  }],
  ["get", "/products/", ({ query }) => {
    let results = [...db.products]
    if (query.gradeBand && query.gradeBand !== "all") results = results.filter((p) => p.gradeBand === query.gradeBand || p.gradeBand === "all")
    if (query.category && query.category !== "all") results = results.filter((p) => p.category === query.category || (query.category === "textbook" && !p.category && p.gradeBand !== "all"))
    if (query.curriculum) results = results.filter((p) => p.curricula?.includes(query.curriculum!) ?? query.curriculum === "cbe")
    if (query.audience) results = results.filter((p) => p.audience === query.audience || p.audience === "all")
    if (query.department) results = results.filter((p) => p.department === query.department)
    if (query.subject) results = results.filter((p) => p.subject.toLowerCase() === query.subject!.toLowerCase())
    if (query.publisher) results = results.filter((p) => p.publisherName.toLowerCase() === query.publisher!.toLowerCase())
    if (query.search) results = results.filter((p) => `${p.title} ${p.publisherName} ${p.subject}`.toLowerCase().includes(query.search!.toLowerCase()))
    if (query.sort === "price_asc") results.sort((a, b) => a.priceCents - b.priceCents)
    else if (query.sort === "price_desc") results.sort((a, b) => b.priceCents - a.priceCents)
    else if (query.sort === "title") results.sort((a, b) => a.title.localeCompare(b.title))
    else results.sort((a, b) => b.schoolListCount - a.schoolListCount)
    return { count: results.length, next: null, previous: null, results }
  }],
  ["get", "/products/:id/", ({ params }) => db.productDetail(db.products.find((p) => p.id === params.id) ?? raise(notFound()))],

  ["get", "/children/", () => db.children.map((c) => {
    const latest = [...orders.values()].filter((o) => o.studentName === c.name).at(-1)
    return latest
      ? { ...c, openBooklist: latest.status === "pending_payment" ? c.openBooklist : null, latestOrder: { id: latest.id, number: latest.number, status: latest.status, expectedAtSchool: latest.expectedAtSchool } }
      : c
  })],
  ["get", "/booklists/:id/", ({ params }) => booklists.get(params.id) ?? raise(notFound())],
  ["get", "/orders/", () => {
    const results = [...orders.values()].reverse()
    return { count: results.length, next: null, previous: null, results }
  }],
  ["post", "/orders/", ({ body }) => {
    const child = db.children.find((c) => c.id === body.studentId)
    const list = booklists.get(String(body.booklistId))
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

  ["get", "/school/overview/", () => {
    const deliveries = [...schoolDeliveries.values()]
    return {
      ...db.schoolOverview,
      packsCollected: [...schoolOrders.values()].filter((o) => o.status === "collected").length,
      deliveriesReceived: deliveries.filter((d) => d.status === "received").length,
      deliveries: deliveries.map((d) => ({ id: d.id, publisherName: d.publisherName, packs: d.packs, status: d.status, date: d.receipt?.receivedAt.slice(0, 10) ?? d.expectedAt })),
    }
  }],
  ["get", "/school/booklists/", () => {
    const lists = [...booklists.values()].map((b) => {
      const rows = schoolRows.filter((r) => r.gradeName === b.gradeName)
      const grade = db.schoolGrades.find((g) => g.gradeName === b.gradeName)
      return { ...db.summarise(b), ordered: rows.filter((r) => r.order && !["pending_payment", "payment_failed"].includes(r.order.status)).length, students: rows.length || grade?.students || 0 }
    })
    const taken = new Set(lists.map((l) => l.gradeName))
    return { termName: db.schoolOverview.termName, lists, gradesWithoutList: db.schoolGrades.filter((g) => !taken.has(g.gradeName)) }
  }],
  ["post", "/school/booklists/", ({ body }) => {
    const grade = db.schoolGrades.find((g) => g.gradeName === body.gradeName) ?? raise(new HttpError(400, { gradeName: ["Choose a grade."] }))
    if ([...booklists.values()].some((b) => b.gradeName === grade.gradeName)) throw new HttpError(409, { detail: `${grade.gradeName} already has a list this term.` })
    const list: Booklist = {
      id: `bl-${grade.gradeName.toLowerCase().replace(/\s+/g, "")}-${Date.now().toString(36)}`,
      schoolId: "sch-greenhill",
      schoolName: "Greenhill Academy",
      termName: db.schoolOverview.termName,
      gradeName: grade.gradeName,
      classNames: grade.classNames,
      orderDeadline: db.schoolOverview.orderDeadline,
      deliverBy: "2027-01-20",
      status: "draft",
      items: [],
    }
    booklists.set(list.id, list)
    return list
  }],
  ["put", "/school/booklists/:id/", ({ params, body }) => {
    const list = booklists.get(params.id) ?? raise(notFound())
    const input = (body.items as { productId: string; required: boolean; qtyPerStudent: number; note: string | null }[] | undefined) ?? []
    const seen = new Set<string>()
    const items = input.map((i) => {
      const c = catalogById.get(i.productId) ?? raise(new HttpError(400, { items: ["One of these titles is no longer in the catalog."] }))
      if (seen.has(i.productId)) throw new HttpError(400, { items: [`${c.title} is on the list twice.`] })
      seen.add(i.productId)
      if (!Number.isInteger(i.qtyPerStudent) || i.qtyPerStudent < 1 || i.qtyPerStudent > 20) throw new HttpError(400, { items: [`Quantity for ${c.title} must be 1 to 20.`] })
      const note = i.note?.trim() || null
      if (note && note.length > 140) throw new HttpError(400, { items: [`Keep the note on ${c.title} under 140 characters.`] })
      return { id: `${list.id}-${c.productId}`, productId: c.productId, title: c.title, publisherName: c.publisherName, subject: c.subject, unitPriceCents: c.priceCents, qtyPerStudent: i.qtyPerStudent, required: !!i.required, note }
    })
    const next = { ...list, orderDeadline: String(body.orderDeadline ?? ""), deliverBy: String(body.deliverBy ?? ""), items }
    checkBooklist(next, list.status === "published")
    booklists.set(list.id, next)
    return next
  }],
  ["post", "/school/booklists/:id/publish/", ({ params }) => {
    const list = booklists.get(params.id) ?? raise(notFound())
    if (list.status === "published") throw new HttpError(409, { detail: "This list is already published." })
    checkBooklist(list, true)
    list.status = "published"
    return list
  }],
  ["get", "/school/catalog/", ({ query }) => {
    const q = (query.search ?? "").trim().toLowerCase()
    return db.schoolCatalog.filter(
      (c) =>
        (!query.category || query.category === "all" || c.category === query.category) &&
        (!q || `${c.title} ${c.publisherName} ${c.subject} ${c.isbn ?? ""} ${c.gradeLabel}`.toLowerCase().includes(q))
    )
  }],
  ["get", "/school/collection/", () => [...schoolOrders.values()].filter((o) => ["in_fulfilment", "at_school", "collected"].includes(o.status)).map(collectionRow)],
  ["post", "/school/collection/handover/", ({ body }) => {
    const className = String(body.className ?? "")
    const code = String(body.code ?? "").trim()
    if (!/^\d{4}$/.test(code)) throw new HttpError(400, { code: ["Collection codes are 4 digits."] })
    const attempts = codeAttempts.get(className) ?? { wrong: 0, lockedUntil: 0 }
    if (attempts.lockedUntil > Date.now()) throw new HttpError(429, { detail: "Too many wrong codes. Wait a minute, then try again." })
    const order = [...schoolOrders.values()].find((o) => o.className === className && o.collectionCode === code)
    if (!order) {
      attempts.wrong += 1
      if (attempts.wrong >= 5) Object.assign(attempts, { wrong: 0, lockedUntil: Date.now() + 60_000 })
      codeAttempts.set(className, attempts)
      throw new HttpError(404, { code: [`No pack in ${className} has that code. Check the number again.`] })
    }
    codeAttempts.delete(className)
    if (order.status === "collected") throw new HttpError(409, { code: [`${order.studentName}'s pack was already collected.`] })
    if (order.status !== "at_school") {
      const waiting = order.shipments.filter((s) => s.status !== "received").map((s) => s.publisherName)
      throw new HttpError(409, { code: [`${order.studentName}'s pack isn't complete yet: waiting for ${waiting.join(" and ")}.`] })
    }
    Object.assign(order, { status: "collected", collectedAt: new Date().toISOString().replace("Z", "+00:00") })
    const row = schoolRows.find((r) => r.order?.id === order.id)
    if (row?.order) row.order.status = "collected"
    return collectionRow(order)
  }],
  ["post", "/school/collection/:id/resend/", ({ params }) => {
    const order = schoolOrders.get(params.id) ?? raise(notFound())
    if (!order.parentPhone) throw new HttpError(400, { detail: "There's no parent phone on file for this student." })
    return { sentTo: order.parentPhone }
  }],

  ["get", "/school/settings/", () => schoolSettings],
  ["patch", "/school/settings/profile/", ({ body }) => {
    const phone = String(body.phone ?? "")
    if (!/^2547\d{8}$|^2541\d{8}$/.test(phone)) throw new HttpError(400, { phone: ["Enter a Kenyan mobile number."] })
    Object.assign(schoolSettings.profile, {
      contactName: String(body.contactName),
      phone,
      email: String(body.email).toLowerCase(),
      county: String(body.county),
      deliveryAddress: String(body.deliveryAddress),
      deliveryHours: String(body.deliveryHours),
    })
    return schoolSettings
  }],
  ["put", "/school/settings/parents/", ({ body }) => {
    const reminderDays = Number(body.reminderDays)
    if (![0, 1, 3, 5, 7].includes(reminderDays)) throw new HttpError(400, { reminderDays: ["Choose when to remind parents."] })
    schoolSettings.parents = {
      reminderDays,
      smsWhenAtSchool: !!body.smsWhenAtSchool,
      collectionPoint: body.collectionPoint === "school_office" ? "school_office" : "class_teacher",
    }
    return schoolSettings
  }],
  ["post", "/school/team/", ({ body }) => {
    const contact = String(body.contact ?? "")
    if (schoolSettings.team.some((m) => m.contact.toLowerCase() === contact.toLowerCase())) throw new HttpError(400, { contact: ["Someone on your staff already uses this."] })
    const role = body.role as SchoolStaffRole
    const classNames = role === "teacher" ? validClasses(body.classNames) : []
    if (role === "teacher" && classNames.length === 0) throw new HttpError(400, { classNames: ["Choose at least one class for this teacher."] })
    schoolSettings.team.push({ id: `st-${++staffSeq}`, name: String(body.name), contact, role, classNames, status: "invited", isYou: false })
    return schoolSettings
  }],
  ["patch", "/school/team/:id/", ({ params, body }) => {
    const member = findStaff(params.id)
    if (body.role && member.isYou) throw new HttpError(400, { role: ["You can't change your own role."] })
    if (body.role && member.role === "school_admin" && body.role !== "school_admin" && schoolAdmins().length === 1)
      throw new HttpError(400, { role: ["The school needs at least one admin."] })
    if (body.role) member.role = body.role as typeof member.role
    if (body.classNames !== undefined) member.classNames = validClasses(body.classNames)
    if (member.role !== "teacher") member.classNames = []
    return schoolSettings
  }],
  ["delete", "/school/team/:id/", ({ params }) => {
    const member = findStaff(params.id)
    if (member.isYou) throw new HttpError(400, { detail: "You can't remove yourself." })
    if (member.role === "school_admin" && schoolAdmins().length === 1) throw new HttpError(400, { detail: "The school needs at least one admin." })
    schoolSettings.team = schoolSettings.team.filter((m) => m.id !== member.id)
    return schoolSettings
  }],

  ["get", "/school/deliveries/", () => [...schoolDeliveries.values()]],
  ["get", "/school/deliveries/:id/", ({ params }) => schoolDeliveries.get(params.id) ?? raise(notFound())],
  ["post", "/school/deliveries/:id/receive/", ({ params, body, userId }) => {
    const delivery = schoolDeliveries.get(params.id) ?? raise(notFound())
    if (delivery.status !== "dispatched") throw new HttpError(409, { detail: "This delivery isn't on its way, so it can't be received yet." })
    const counts = new Map(((body.classes as { className: string; received: number }[] | undefined) ?? []).map((c) => [c.className, c.received]))
    for (const c of delivery.classes) {
      const n = counts.get(c.className)
      if (n === undefined || !Number.isInteger(n) || n < 0) throw new HttpError(400, { classes: [`Enter how many packs arrived for ${c.className}.`] })
      if (n > c.expected) throw new HttpError(400, { classes: [`${c.className} has more packs than were sent. Check the labels: a pack may belong to another class.`] })
    }
    const packsReceived = delivery.classes.reduce((t, c) => t + counts.get(c.className)!, 0)
    if (packsReceived === 0) throw new HttpError(400, { classes: ["Nothing counted. If the delivery didn't arrive, don't confirm it."] })
    const issues = ((body.issues as string[] | undefined) ?? []).filter((i): i is "damaged" | "wrong_items" => i === "damaged" || i === "wrong_items")
    const notes = String(body.notes ?? "").trim()
    if ((issues.length > 0 || packsReceived < delivery.packs) && !notes) throw new HttpError(400, { notes: [`Tell ${delivery.publisherName} what's wrong so they can fix it.`] })
    const user = Object.values(db.demoUsers).find((u) => u.id === userId)
    Object.assign(delivery, {
      status: "received",
      classes: delivery.classes.map((c) => ({ ...c, received: counts.get(c.className)! })),
      receipt: { receivedAt: new Date().toISOString().replace("Z", "+00:00"), receivedBy: user?.name ?? "School admin", packsReceived, issues, notes, signOffCode: String(1000 + Math.floor(Math.random() * 9000)) },
    })
    // Parents' orders: this publisher's part is now at school; once every part is, the order is ready to collect.
    for (const order of schoolOrders.values()) {
      const shipment = order.shipments.find((sh) => sh.publisherName === delivery.publisherName)
      if (!shipment || order.status !== "in_fulfilment") continue
      shipment.status = "received"
      if (order.shipments.every((sh) => sh.status === "received")) {
        order.status = "at_school"
        const row = schoolRows.find((r) => r.order?.id === order.id)
        if (row?.order) row.order.status = "at_school"
      }
    }
    return delivery
  }],
  ["get", "/school/orders/", () => ({ termName: db.schoolOverview.termName, orderDeadline: db.schoolOverview.orderDeadline, rows: schoolRows })],
  ["get", "/school/orders/:id/", ({ params }) => schoolOrders.get(params.id) ?? raise(notFound())],
  ["post", "/school/orders/remind/", ({ body }) => {
    const ids = new Set((body.studentIds as string[] | undefined) ?? [])
    if (ids.size === 0) throw new HttpError(400, { studentIds: ["Choose at least one student."] })
    const dayAgo = Date.now() - 86_400_000
    let sent = 0, skipped = 0
    for (const row of schoolRows) {
      if (!ids.has(row.studentId)) continue
      const paid = row.order && !["pending_payment", "payment_failed"].includes(row.order.status)
      if (paid || !row.parentPhone || (row.remindedAt && Date.parse(row.remindedAt) > dayAgo)) skipped++
      else { row.remindedAt = new Date().toISOString(); sent++ }
    }
    return { sent, skipped }
  }],
  ["get", "/publisher/batches/", () => [...batches.values()]],
  ["post", "/publisher/batches/:id/dispatch/", ({ params, body }) => {
    const batch = batches.get(params.id) ?? raise(notFound())
    if (batch.status !== "ready_to_pack") throw new HttpError(409, { detail: "This batch isn't ready to dispatch." })
    const unavailable = ((body.unavailableLines as string[]) ?? []).filter((t) => batch.lines.some((l) => l.title === t))
    if (unavailable.length === batch.lines.length) throw new HttpError(400, { unavailableLines: ["At least one title must be in the delivery."] })
    Object.assign(batch, {
      status: "dispatched",
      unavailableLines: unavailable,
      dispatch: {
        deliveryNoteNo: `DN-${++deliveryNoteSeq}`,
        carrier: String(body.carrier),
        driverName: String(body.driverName),
        driverPhone: String(body.driverPhone),
        vehicleReg: String(body.vehicleReg).toUpperCase(),
        cartons: Number(body.cartons),
        dispatchedAt: new Date().toISOString().replace("Z", "+00:00"),
        expectedAt: String(body.expectedAt),
      },
    })
    return batch
  }],
  ["get", "/publisher/catalog/", () => [...catalog.values()]],
  ["get", "/publisher/payouts/", () => payouts],
  ["get", "/publisher/settings/", () => settings],
  ["patch", "/publisher/settings/profile/", ({ body }) => {
    Object.assign(settings.profile, body)
    return settings
  }],
  ["put", "/publisher/settings/notifications/", ({ body }) => {
    settings.notifications = body as typeof settings.notifications
    return settings
  }],
  ["post", "/publisher/team/", ({ body }) => {
    const contact = String(body.contact)
    if (settings.team.some((m) => m.contact.toLowerCase() === contact.toLowerCase())) throw new HttpError(400, { contact: ["Someone on your team already uses this."] })
    settings.team.push({ id: `tm-${++teamSeq}`, name: String(body.name), contact, role: body.role as "admin", status: "invited", isYou: false })
    return settings
  }],
  ["patch", "/publisher/team/:id/", ({ params, body }) => {
    const m = findTeam(params.id)
    if (m.role === "admin" && body.role !== "admin" && admins().length === 1 && m.status === "active") throw new HttpError(400, { role: ["Your team needs at least one admin."] })
    m.role = body.role as typeof m.role
    return settings
  }],
  ["delete", "/publisher/team/:id/", ({ params }) => {
    const m = findTeam(params.id)
    if (m.isYou) throw new HttpError(400, { detail: "You can't remove yourself." })
    if (m.role === "admin" && m.status === "active" && admins().length === 1) throw new HttpError(400, { detail: "Your team needs at least one admin." })
    settings.team = settings.team.filter((x) => x.id !== m.id)
    return settings
  }],
  ["put", "/publisher/payout-account/", ({ body }) => {
    const number = String(body.number ?? "").replace(/\s/g, "")
    const method = body.method as PublisherPayouts["account"]["method"]
    if (!/^\d{5,16}$/.test(number)) throw new HttpError(400, { number: ["Enter the number without spaces or dashes."] })
    const tail = number.slice(-2)
    const masked =
      method === "bank" ? `${String(body.reference)} · Account *** ${number.slice(-4)}`
      : method === "mpesa_till" ? `Till ${number.slice(0, 3)} *** ${tail}`
      : `Paybill ${number.slice(0, 3)} *** ${tail} · Account ${String(body.reference).toUpperCase()}`
    payouts.account = { method, accountName: String(body.accountName), masked, status: "pending_verification" }
    return payouts.account
  }],
  ["post", "/publisher/catalog/", ({ body }) => {
    const isbn = body.isbn ? String(body.isbn) : null
    if (isbn && [...catalog.values()].some((c) => c.isbn === isbn)) throw new HttpError(400, { isbn: ["A title with this ISBN is already in your catalog."] })
    const item = { ...(body as Omit<CatalogItem, "id" | "schoolListCount">), isbn, id: `cat-${++catalogSeq}`, schoolListCount: 0 }
    catalog.set(item.id, item)
    return item
  }],
  ["patch", "/publisher/catalog/:id/", ({ params, body }) => {
    const item = catalog.get(params.id) ?? raise(notFound())
    const isbn = "isbn" in body ? (body.isbn ? String(body.isbn) : null) : item.isbn
    if (isbn && [...catalog.values()].some((c) => c.isbn === isbn && c.id !== item.id)) throw new HttpError(400, { isbn: ["Another title already uses this ISBN."] })
    Object.assign(item, body, { isbn })
    return item
  }],
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

/** Mock mode only: a code that works right now in this class, so the demo can be tried. */
export function demoCollectionCode(className: string) {
  const order = [...schoolOrders.values()].find((o) => o.className === className && o.status === "at_school")
  return order?.collectionCode ? { studentName: order.studentName, code: order.collectionCode } : null
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
      const auth = String(config.headers?.Authorization ?? "")
      const userId = auth.startsWith("Bearer mock-access-") ? auth.slice("Bearer mock-access-".length) : null
      return respond(created ? 201 : 200, structuredClone(handler({ params, query, body, userId })))
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

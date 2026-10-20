import { z } from "zod"

/*
 * Runtime contracts for the Django REST Framework API.
 *
 * The backend renders camelCase JSON (djangorestframework-camel-case) and
 * stores money as integer KES cents. Every response is parsed with these
 * schemas so a contract drift fails loudly at the boundary instead of deep
 * inside a component.
 */

export const roleSchema = z.enum(["parent", "school_admin", "teacher", "publisher", "platform_admin"])
export type Role = z.infer<typeof roleSchema>

const isoDate = z.iso.date()
const isoDateTime = z.iso.datetime({ offset: true })
const cents = z.number().int().nonnegative()

export const membershipSchema = z.object({
  orgId: z.string(),
  orgName: z.string(),
  orgType: z.enum(["school", "publisher", "platform"]),
  role: roleSchema,
})

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.email().nullable(),
  roles: z.array(roleSchema).min(1),
  memberships: z.array(membershipSchema),
})
export type User = z.infer<typeof userSchema>

export const authTokensSchema = z.object({
  access: z.string(),
  refresh: z.string(),
  user: userSchema,
})
export type AuthTokens = z.infer<typeof authTokensSchema>

/** Where a one-time code went, e.g. { channel: "sms", destination: "0712 ••• 678" }. */
export const codeSentSchema = z.object({
  sent: z.literal(true),
  channel: z.enum(["sms", "email"]),
  destination: z.string(),
})
export type CodeSent = z.infer<typeof codeSentSchema>

export const orgApplicationSchema = z.object({
  id: z.string(),
  orgType: z.enum(["school", "publisher"]),
  orgName: z.string(),
  status: z.enum(["pending_review", "approved", "rejected"]),
})
export type OrgApplication = z.infer<typeof orgApplicationSchema>

export const schoolSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  town: z.string(),
  county: z.string(),
  verified: z.boolean(),
})
export type School = z.infer<typeof schoolSchema>

export const booklistStatusSchema = z.enum(["draft", "published", "closed"])

export const booklistItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  title: z.string(),
  publisherName: z.string(),
  subject: z.string(),
  unitPriceCents: cents,
  qtyPerStudent: z.number().int().positive(),
  required: z.boolean(),
})
export type BooklistItem = z.infer<typeof booklistItemSchema>

export const booklistSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  schoolName: z.string(),
  termName: z.string(),
  gradeName: z.string(),
  classNames: z.array(z.string()),
  orderDeadline: isoDate,
  deliverBy: isoDate,
  status: booklistStatusSchema,
  items: z.array(booklistItemSchema),
})
export type Booklist = z.infer<typeof booklistSchema>

export const booklistSummarySchema = booklistSchema
  .omit({ items: true })
  .extend({ itemCount: z.number().int(), requiredTotalCents: cents })
export type BooklistSummary = z.infer<typeof booklistSummarySchema>

export const orderStatusSchema = z.enum([
  "pending_payment",
  "payment_failed",
  "paid",
  "in_fulfilment",
  "at_school",
  "collected",
  "cancelled",
  "partially_refunded",
  "refunded",
])
export type OrderStatus = z.infer<typeof orderStatusSchema>

export const orderRefSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: orderStatusSchema,
  expectedAtSchool: isoDate.nullable(),
})

export const childSchema = z.object({
  id: z.string(),
  name: z.string(),
  admissionNo: z.string(),
  schoolId: z.string(),
  schoolName: z.string(),
  gradeName: z.string(),
  className: z.string(),
  openBooklist: booklistSummarySchema.nullable(),
  latestOrder: orderRefSchema.nullable(),
})
export type Child = z.infer<typeof childSchema>

export const shipmentStatusSchema = z.enum(["collecting", "ready_to_pack", "dispatched", "received"])

export const orderSchema = z.object({
  id: z.string(),
  number: z.string(),
  status: orderStatusSchema,
  studentName: z.string(),
  schoolName: z.string(),
  className: z.string(),
  subtotalCents: cents,
  totalCents: cents,
  collectionCode: z.string().nullable(),
  paidAt: isoDateTime.nullable(),
  mpesaReceipt: z.string().nullable(),
  expectedAtSchool: isoDate.nullable(),
  collectedAt: isoDateTime.nullable(),
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      publisherName: z.string(),
      qty: z.number().int().positive(),
      unitPriceCents: cents,
      status: z.enum(["active", "unavailable", "refunded"]),
    })
  ),
  shipments: z.array(
    z.object({
      publisherName: z.string(),
      summary: z.string(),
      status: shipmentStatusSchema,
    })
  ),
})
export type Order = z.infer<typeof orderSchema>

export const paymentSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  method: z.enum(["mpesa", "card"]),
  status: z.enum(["initiated", "succeeded", "failed"]),
  amountCents: cents,
  phone: z.string().nullable(),
  failureReason: z.enum(["timeout", "cancelled", "insufficient_funds"]).nullable(),
})
export type Payment = z.infer<typeof paymentSchema>

export const productSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** Optional thumbnail used by mock fixtures and future publisher uploads. */
  imageUrl: z.url().optional(),
  publisherName: z.string(),
  subject: z.string(),
  gradeLabel: z.string(),
  gradeBand: z.enum(["pp", "1-3", "4-6", "7-9", "all"]),
  priceCents: cents,
  schoolListCount: z.number().int().nonnegative(),
  /** Optional catalogue facets; existing backend records remain valid while migrated. */
  category: z.enum(["textbook", "reader", "reference", "revision", "stationery", "college"]).optional(),
  curricula: z.array(z.string()).optional(),
  audience: z.enum(["school", "college", "all"]).optional(),
  department: z.string().optional(),
  faculty: z.string().optional(),
  gradeIds: z.array(z.string()).optional(),
})
export type Product = z.infer<typeof productSchema>

export const productDetailSchema = productSchema.extend({
  description: z.string(),
  isbn: z.string().nullable(),
  pages: z.number().int().positive().nullable(),
  format: z.string(),
  kicdApproved: z.boolean(),
  /** A few schools whose published lists include this item, for reassurance. */
  onSchoolLists: z.array(z.object({ slug: z.string(), name: z.string(), town: z.string() })),
  related: z.array(productSchema),
})
export type ProductDetail = z.infer<typeof productDetailSchema>

export const gradeBandSchema = z.enum(["pp", "1-3", "4-6", "7-9", "all"])

/** A title in a publisher's own catalog, with stock. Parents see it as a Product. */
export const catalogItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  subject: z.string(),
  gradeLabel: z.string(),
  gradeBand: gradeBandSchema,
  isbn: z.string().nullable(),
  format: z.string(),
  priceCents: cents,
  stock: z.number().int().nonnegative(),
  /** At or below this, the title shows as low stock. */
  lowStockAt: z.number().int().nonnegative(),
  status: z.enum(["live", "draft"]),
  schoolListCount: z.number().int().nonnegative(),
})
export type CatalogItem = z.infer<typeof catalogItemSchema>

export const schoolOverviewSchema = z.object({
  schoolName: z.string(),
  termName: z.string(),
  studentsOrdered: z.number().int(),
  studentsTotal: z.number().int(),
  orderDeadline: isoDate,
  deliveriesReceived: z.number().int(),
  deliveriesExpected: z.number().int(),
  packsCollected: z.number().int(),
  booklists: z.array(
    booklistSummarySchema.extend({ ordered: z.number().int(), students: z.number().int() })
  ),
  deliveries: z.array(
    z.object({
      id: z.string(),
      publisherName: z.string(),
      packs: z.number().int(),
      status: shipmentStatusSchema,
      date: isoDate.nullable(),
    })
  ),
})
export type SchoolOverview = z.infer<typeof schoolOverviewSchema>

export const schoolBatchSchema = z.object({
  id: z.string(),
  schoolName: z.string(),
  town: z.string(),
  packs: z.number().int(),
  valueCents: cents,
  dueAtSchool: isoDate,
  status: shipmentStatusSchema,
  collectingUntil: isoDate.nullable(),
  lines: z.array(z.object({ title: z.string(), qty: z.number().int() })),
})
export type SchoolBatch = z.infer<typeof schoolBatchSchema>

export const adminOverviewSchema = z.object({
  termName: z.string(),
  salesCents: cents,
  paidOrders: z.number().int(),
  heldCents: cents,
  mpesaSuccessRate: z.number().min(0).max(1),
  liveSchools: z.number().int(),
  livePublishers: z.number().int(),
  alerts: z.array(
    z.object({
      id: z.string(),
      severity: z.enum(["high", "medium", "info"]),
      title: z.string(),
      detail: z.string(),
      href: z.string(),
    })
  ),
})
export type AdminOverview = z.infer<typeof adminOverviewSchema>

/** DRF paginated list envelope. */
export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({
    count: z.number().int(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(item),
  })

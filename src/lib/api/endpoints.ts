import { z } from "zod"

import { api } from "@/lib/api/client"
import {
  adminOverviewSchema,
  authTokensSchema,
  booklistSchema,
  booklistSummarySchema,
  childSchema,
  orderSchema,
  paginated,
  paymentSchema,
  productSchema,
  schoolBatchSchema,
  schoolOverviewSchema,
  schoolSchema,
  userSchema,
} from "@/lib/api/schemas"

/*
 * One function per DRF endpoint. Components never call axios directly: they use
 * the TanStack Query hooks in ./queries.ts, which wrap these.
 */

async function get<T extends z.ZodType>(url: string, schema: T, params?: object) {
  const { data } = await api.get(url, { params })
  return schema.parse(data) as z.infer<T>
}

async function post<T extends z.ZodType>(url: string, schema: T, body?: object) {
  const { data } = await api.post(url, body)
  return schema.parse(data) as z.infer<T>
}

// Auth — phone + SMS one-time code.
export const requestOtp = (phone: string) =>
  post("/auth/otp/request/", z.object({ sent: z.literal(true) }), { phone })
export const verifyOtp = (phone: string, code: string) =>
  post("/auth/otp/verify/", authTokensSchema, { phone, code })
export const getMe = () => get("/me/", userSchema)

// Public
export const searchSchools = (search: string) =>
  get("/schools/", paginated(schoolSchema), { search })
export const getSchool = (slug: string) => get(`/schools/${slug}/`, schoolSchema)
export const listSchoolBooklists = (slug: string) =>
  get(`/schools/${slug}/booklists/`, z.array(booklistSchema))
export const listProducts = (gradeBand?: string) =>
  get("/products/", paginated(productSchema), { gradeBand })
export const getProduct = (id: string) => get(`/products/${id}/`, productSchema)

// Parent
export const listChildren = () => get("/children/", z.array(childSchema))
export const getBooklist = (id: string) => get(`/booklists/${id}/`, booklistSchema)
export type CreateOrderInput = {
  studentId: string
  booklistId: string
  excludedItemIds: string[]
  extraItems: { productId: string; qty: number }[]
}
export const createOrder = (input: CreateOrderInput) =>
  post("/orders/", orderSchema, input)
export const getOrder = (id: string) => get(`/orders/${id}/`, orderSchema)
export const listOrders = () => get("/orders/", paginated(orderSchema))
export const startPayment = (orderId: string, input: { method: "mpesa"; phone: string }) =>
  post(`/orders/${orderId}/payments/`, paymentSchema, input)
export const getPayment = (id: string) => get(`/payments/${id}/`, paymentSchema)

// School
export const getSchoolOverview = () => get("/school/overview/", schoolOverviewSchema)
export const listMyBooklists = () => get("/school/booklists/", z.array(booklistSummarySchema))

// Publisher
export const listPublisherBatches = () => get("/publisher/batches/", z.array(schoolBatchSchema))

// Platform admin
export const getAdminOverview = () => get("/admin/overview/", adminOverviewSchema)

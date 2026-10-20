import { z } from "zod"

import { api } from "@/lib/api/client"
import type { PublisherSettings, TeamRole } from "@/lib/api/schemas"
import {
  adminOverviewSchema,
  authTokensSchema,
  booklistSchema,
  booklistSummarySchema,
  catalogItemSchema,
  childSchema,
  codeSentSchema,
  orderSchema,
  orgApplicationSchema,
  paginated,
  paymentSchema,
  payoutAccountSchema,
  publisherPayoutsSchema,
  publisherSettingsSchema,
  productDetailSchema,
  productSchema,
  remindResultSchema,
  schoolBatchSchema,
  schoolDeliverySchema,
  schoolOrderDetailSchema,
  schoolOrdersSchema,
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

// Auth. Parents sign in with phone + password (or an SMS code); staff can also use their email.
export const signInWithPassword = (input: { identifier: string; password: string }) =>
  post("/auth/login/", authTokensSchema, input)
export const requestOtp = (phone: string) =>
  post("/auth/otp/request/", codeSentSchema, { phone })
export const verifyOtp = (phone: string, code: string) =>
  post("/auth/otp/verify/", authTokensSchema, { phone, code })

/** Parent sign-up: creates an unverified account and texts a code to the phone. */
export const registerParent = (input: { name: string; phone: string; password: string }) =>
  post("/auth/register/", codeSentSchema, input)
export const verifyRegistration = (phone: string, code: string) =>
  post("/auth/register/verify/", authTokensSchema, { phone, code })
export const resendRegistrationCode = (phone: string) =>
  post("/auth/register/resend/", codeSentSchema, { phone })

/** identifier is a 2547… phone number or an email address. */
export const requestPasswordReset = (identifier: string) =>
  post("/auth/password/forgot/", codeSentSchema, { identifier })
export const resetPassword = (input: { identifier: string; code: string; password: string }) =>
  post("/auth/password/reset/", z.object({ reset: z.literal(true) }), input)

export type OrgApplicationInput = {
  orgType: "school" | "publisher"
  orgName: string
  county: string
  registrationNo: string
  contactName: string
  contactRole: string
  email: string
  phone: string
  password: string
}
/** School or publisher sign-up. Lands in the platform admin verification queue. */
export const applyForOrganisation = (input: OrgApplicationInput) =>
  post("/organisations/applications/", orgApplicationSchema, input)
export const getMe = () => get("/me/", userSchema)

// Public
export const searchSchools = (search: string) =>
  get("/schools/", paginated(schoolSchema), { search })
export const getSchool = (slug: string) => get(`/schools/${slug}/`, schoolSchema)
export const listSchoolBooklists = (slug: string) =>
  get(`/schools/${slug}/booklists/`, z.array(booklistSchema))
export const listProducts = (filters: Record<string, string> = {}) =>
  get("/products/", paginated(productSchema), filters)
export const getProduct = (id: string) => get(`/products/${id}/`, productDetailSchema)

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
export const listSchoolDeliveries = () => get("/school/deliveries/", z.array(schoolDeliverySchema))
export const getSchoolDelivery = (id: string) => get(`/school/deliveries/${id}/`, schoolDeliverySchema)
export type ReceiveInput = {
  classes: { className: string; received: number }[]
  issues: ("damaged" | "wrong_items")[]
  notes: string
}
/** Confirm a delivery. Releases the publisher's payment for the packs received; short or damaged packs open a claim. */
export const receiveDelivery = (id: string, input: ReceiveInput) =>
  post(`/school/deliveries/${id}/receive/`, schoolDeliverySchema, input)
export const getSchoolOrders = () => get("/school/orders/", schoolOrdersSchema)
export const getSchoolOrder = (id: string) => get(`/school/orders/${id}/`, schoolOrderDetailSchema)
/** SMS the parents of these students. Students without a phone, or reminded in the last 24 h, are skipped. */
export const remindParents = (studentIds: string[]) =>
  post("/school/orders/remind/", remindResultSchema, { studentIds })

// Publisher
export type CatalogItemInput = Omit<z.infer<typeof catalogItemSchema>, "id" | "schoolListCount">
export const listCatalog = () => get("/publisher/catalog/", z.array(catalogItemSchema))
export const createCatalogItem = (input: CatalogItemInput) =>
  post("/publisher/catalog/", catalogItemSchema, input)
export const updateCatalogItem = async (id: string, input: Partial<CatalogItemInput>) => {
  const { data } = await api.patch(`/publisher/catalog/${id}/`, input)
  return catalogItemSchema.parse(data)
}
export const listPublisherBatches = () => get("/publisher/batches/", z.array(schoolBatchSchema))
export type DispatchInput = {
  carrier: string
  driverName: string
  driverPhone: string
  vehicleReg: string
  cartons: number
  expectedAt: string
  unavailableLines: string[]
}
/** Hand a school's packed batch to the carrier. The school is notified to expect it. */
export const dispatchBatch = (id: string, input: DispatchInput) =>
  post(`/publisher/batches/${id}/dispatch/`, schoolBatchSchema, input)

export const getPublisherPayouts = () => get("/publisher/payouts/", publisherPayoutsSchema)
export type PayoutAccountInput = {
  method: "mpesa_paybill" | "mpesa_till" | "bank"
  accountName: string
  /** Paybill / till number, or bank account number. */
  number: string
  /** Paybill account reference, or bank name and branch. */
  reference: string
}
/** New payout details are checked by SchoolShop before the next payout uses them. */
export const updatePayoutAccount = async (input: PayoutAccountInput) => {
  const { data } = await api.put("/publisher/payout-account/", input)
  return payoutAccountSchema.parse(data)
}

export const getPublisherSettings = () => get("/publisher/settings/", publisherSettingsSchema)
export type ProfileInput = Pick<PublisherSettings["profile"], "contactName" | "phone" | "email" | "dispatchAddress" | "county">
export const updatePublisherProfile = async (input: ProfileInput) => {
  const { data } = await api.patch("/publisher/settings/profile/", input)
  return publisherSettingsSchema.parse(data)
}
export const updateNotifications = async (input: PublisherSettings["notifications"]) => {
  const { data } = await api.put("/publisher/settings/notifications/", input)
  return publisherSettingsSchema.parse(data)
}
/** contact is a 2547… phone number or an email; they get an SMS or email invite. */
export const inviteTeamMember = (input: { name: string; contact: string; role: TeamRole }) =>
  post("/publisher/team/", publisherSettingsSchema, input)
export const updateTeamMember = async (id: string, input: { role: TeamRole }) => {
  const { data } = await api.patch(`/publisher/team/${id}/`, input)
  return publisherSettingsSchema.parse(data)
}
export const removeTeamMember = async (id: string) => {
  const { data } = await api.delete(`/publisher/team/${id}/`)
  return publisherSettingsSchema.parse(data)
}
export const changePassword = (input: { currentPassword: string; newPassword: string }) =>
  post("/auth/password/change/", z.object({ changed: z.literal(true) }), input)

// Platform admin
export const getAdminOverview = () => get("/admin/overview/", adminOverviewSchema)

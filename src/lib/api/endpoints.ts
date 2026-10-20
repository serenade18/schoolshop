import { z } from "zod"

import { api } from "@/lib/api/client"
import type { PublisherSettings, SchoolSettings, SchoolStaffRole, TeamRole } from "@/lib/api/schemas"
import {
  accountSchema,
  adminOverviewSchema,
  authTokensSchema,
  booklistSchema,
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
  collectionRowSchema,
  schoolBatchSchema,
  schoolBooklistsSchema,
  schoolCatalogItemSchema,
  schoolDeliverySchema,
  schoolOrderDetailSchema,
  schoolOrdersSchema,
  schoolOverviewSchema,
  schoolSchema,
  schoolSettingsSchema,
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
/** Link a child using the code their school gives parents and the child's admission number. */
export const addChild = (input: { schoolCode: string; admissionNo: string; name: string }) => post("/children/", childSchema, input)
export const removeChild = async (id: string) => {
  await api.delete(`/children/${id}/`)
}

export const getAccount = () => get("/account/", accountSchema)
export const updateAccount = async (input: { name: string; email: string | null; mpesaPhone: string }) => {
  const { data } = await api.patch("/account/", input)
  return accountSchema.parse(data)
}
export const updateAccountNotifications = async (input: z.infer<typeof accountSchema>["notifications"]) => {
  const { data } = await api.put("/account/notifications/", input)
  return accountSchema.parse(data)
}
/** Asks SchoolShop to close the account. Refused while an order is in progress. */
export const requestAccountDeletion = () => post("/account/deletion/", z.object({ requested: z.boolean() }))
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
export const listMyBooklists = () => get("/school/booklists/", schoolBooklistsSchema)
export const createBooklist = (gradeName: string) => post("/school/booklists/", booklistSchema, { gradeName })
export type BooklistInput = {
  orderDeadline: string
  deliverBy: string
  items: { productId: string; required: boolean; qtyPerStudent: number; note: string | null }[]
}
export const saveBooklist = async (id: string, input: BooklistInput) => {
  const { data } = await api.put(`/school/booklists/${id}/`, input)
  return booklistSchema.parse(data)
}
/** Publishing SMSes the parents of every student in the grade's classes. */
export const publishBooklist = (id: string) => post(`/school/booklists/${id}/publish/`, booklistSchema)
export const searchSchoolCatalog = (search: string, category: string) =>
  get("/school/catalog/", z.array(schoolCatalogItemSchema), { search, category })
export const listCollection = () => get("/school/collection/", z.array(collectionRowSchema))
/** Hand over a pack: the code the student or parent reads out must match an order in this class. */
export const handOverPack = (input: { className: string; code: string }) =>
  post("/school/collection/handover/", collectionRowSchema, input)
export const resendCollectionCode = (orderId: string) =>
  post(`/school/collection/${orderId}/resend/`, z.object({ sentTo: z.string() }))

export const getSchoolSettings = () => get("/school/settings/", schoolSettingsSchema)
export type SchoolProfileInput = Pick<SchoolSettings["profile"], "contactName" | "phone" | "email" | "county" | "deliveryAddress" | "deliveryHours">
export const updateSchoolProfile = async (input: SchoolProfileInput) => {
  const { data } = await api.patch("/school/settings/profile/", input)
  return schoolSettingsSchema.parse(data)
}
export const updateParentSettings = async (input: SchoolSettings["parents"]) => {
  const { data } = await api.put("/school/settings/parents/", input)
  return schoolSettingsSchema.parse(data)
}
export const inviteSchoolStaff = (input: { name: string; contact: string; role: SchoolStaffRole; classNames: string[] }) =>
  post("/school/team/", schoolSettingsSchema, input)
export const updateSchoolStaff = async (id: string, input: { role?: SchoolStaffRole; classNames?: string[] }) => {
  const { data } = await api.patch(`/school/team/${id}/`, input)
  return schoolSettingsSchema.parse(data)
}
export const removeSchoolStaff = async (id: string) => {
  const { data } = await api.delete(`/school/team/${id}/`)
  return schoolSettingsSchema.parse(data)
}

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

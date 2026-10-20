import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import * as endpoints from "@/lib/api/endpoints"
import type { PublisherSettings } from "@/lib/api/schemas"

export const queryKeys = {
  me: ["me"] as const,
  schools: (search: string) => ["schools", search] as const,
  school: (slug: string) => ["school", slug] as const,
  schoolBooklists: (slug: string) => ["school", slug, "booklists"] as const,
  products: (filters?: Record<string, string>) => ["products", filters ?? {}] as const,
  product: (id: string) => ["product", id] as const,
  children: ["children"] as const,
  booklist: (id: string) => ["booklist", id] as const,
  order: (id: string) => ["order", id] as const,
  orders: ["orders"] as const,
  payment: (id: string) => ["payment", id] as const,
  schoolOverview: ["school-overview"] as const,
  myBooklists: ["school-booklists"] as const,
  schoolOrders: ["school-orders"] as const,
  schoolDeliveries: ["school-deliveries"] as const,
  schoolOrder: (id: string) => ["school-orders", id] as const,
  publisherBatches: ["publisher-batches"] as const,
  catalog: ["publisher-catalog"] as const,
  payouts: ["publisher-payouts"] as const,
  settings: ["publisher-settings"] as const,
  adminOverview: ["admin-overview"] as const,
}

export const useSchools = (search: string) =>
  useQuery({
    queryKey: queryKeys.schools(search),
    queryFn: () => endpoints.searchSchools(search),
    enabled: true,
    placeholderData: (prev) => prev,
  })

export const useSchool = (slug: string) =>
  useQuery({ queryKey: queryKeys.school(slug), queryFn: () => endpoints.getSchool(slug) })

export const useSchoolBooklists = (slug: string) =>
  useQuery({
    queryKey: queryKeys.schoolBooklists(slug),
    queryFn: () => endpoints.listSchoolBooklists(slug),
  })

export type ProductFilters = {
  gradeBand?: string
  category?: string
  curriculum?: string
  audience?: string
  department?: string
  search?: string
  subject?: string
  publisher?: string
  sort?: string
}

export const useProducts = (filters: ProductFilters = {}) => {
  const keyFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => !!v))
  return useQuery({
    queryKey: queryKeys.products(keyFilters),
    queryFn: () => endpoints.listProducts(keyFilters),
  })
}

export const useProduct = (id: string) =>
  useQuery({ queryKey: queryKeys.product(id), queryFn: () => endpoints.getProduct(id) })

export const useChildren = () =>
  useQuery({ queryKey: queryKeys.children, queryFn: endpoints.listChildren })

export const useBooklist = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.booklist(id ?? ""),
    queryFn: () => endpoints.getBooklist(id!),
    enabled: !!id,
  })

export const useOrders = () => useQuery({ queryKey: queryKeys.orders, queryFn: endpoints.listOrders })

export const useOrder = (id: string) =>
  useQuery({ queryKey: queryKeys.order(id), queryFn: () => endpoints.getOrder(id) })

export const useCreateOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: endpoints.createOrder,
    onSuccess: (order) => {
      qc.setQueryData(queryKeys.order(order.id), order)
      qc.invalidateQueries({ queryKey: queryKeys.children })
    },
  })
}

export const useStartPayment = () =>
  useMutation({
    mutationFn: ({ orderId, phone }: { orderId: string; phone: string }) =>
      endpoints.startPayment(orderId, { method: "mpesa", phone }),
  })

/**
 * Polls an M-Pesa STK payment until the backend has the Daraja callback.
 * The order is only ever marked paid server-side; the client just watches.
 */
export const usePaymentStatus = (id: string | null) => {
  const qc = useQueryClient()
  return useQuery({
    queryKey: queryKeys.payment(id ?? ""),
    queryFn: async () => {
      const payment = await endpoints.getPayment(id!)
      if (payment.status === "succeeded") {
        qc.invalidateQueries({ queryKey: queryKeys.order(payment.orderId) })
        qc.invalidateQueries({ queryKey: queryKeys.children })
      }
      return payment
    },
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.status === "initiated" ? 2_000 : false),
  })
}

export const useSchoolOverview = () =>
  useQuery({ queryKey: queryKeys.schoolOverview, queryFn: endpoints.getSchoolOverview })

export const useMyBooklists = () => useQuery({ queryKey: queryKeys.myBooklists, queryFn: endpoints.listMyBooklists })

export const useSchoolCatalog = (search: string, category: string) =>
  useQuery({
    queryKey: ["school-catalog", search, category],
    queryFn: () => endpoints.searchSchoolCatalog(search, category),
    placeholderData: (prev) => prev,
  })

export const useCreateBooklist = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: endpoints.createBooklist,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.myBooklists }),
  })
}

/** Save the list, and publish it too when asked. Keeps the list, index and overview in step. */
export const useSaveBooklist = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input, publish }: { id: string; input: endpoints.BooklistInput; publish?: boolean }) => {
      const saved = await endpoints.saveBooklist(id, input)
      return publish ? endpoints.publishBooklist(id) : saved
    },
    onSuccess: (list) => {
      qc.setQueryData(queryKeys.booklist(list.id), list)
      return Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.myBooklists }),
        qc.invalidateQueries({ queryKey: queryKeys.schoolOverview }),
      ])
    },
  })
}

export const useSchoolDeliveries = () =>
  useQuery({ queryKey: queryKeys.schoolDeliveries, queryFn: endpoints.listSchoolDeliveries })

export const useSchoolDelivery = (id: string) =>
  useQuery({ queryKey: [...queryKeys.schoolDeliveries, id], queryFn: () => endpoints.getSchoolDelivery(id) })

/** Receiving changes the overview counts and parents' order statuses too. */
export const useReceiveDelivery = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: endpoints.ReceiveInput }) => endpoints.receiveDelivery(id, input),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.schoolDeliveries }),
        qc.invalidateQueries({ queryKey: queryKeys.schoolOverview }),
        qc.invalidateQueries({ queryKey: queryKeys.schoolOrders }),
      ]),
  })
}

export const useSchoolOrders = () => useQuery({ queryKey: queryKeys.schoolOrders, queryFn: endpoints.getSchoolOrders })

export const useSchoolOrder = (id: string | null) =>
  useQuery({ queryKey: queryKeys.schoolOrder(id ?? ""), queryFn: () => endpoints.getSchoolOrder(id!), enabled: !!id })

export const useRemindParents = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: endpoints.remindParents,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.schoolOrders }),
  })
}

export const usePublisherBatches = () =>
  useQuery({ queryKey: queryKeys.publisherBatches, queryFn: endpoints.listPublisherBatches })

export const useAdminOverview = () =>
  useQuery({ queryKey: queryKeys.adminOverview, queryFn: endpoints.getAdminOverview })

export const useCatalog = () => useQuery({ queryKey: queryKeys.catalog, queryFn: endpoints.listCatalog })

/** Create a title (no id) or update one (with id); refreshes the catalog either way. */
export const useSaveCatalogItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: endpoints.CatalogItemInput }) =>
      id ? endpoints.updateCatalogItem(id, input) : endpoints.createCatalogItem(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.catalog }),
  })
}

export const useDispatchBatch = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: endpoints.DispatchInput }) => endpoints.dispatchBatch(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.publisherBatches }),
  })
}

export const usePublisherPayouts = () =>
  useQuery({ queryKey: queryKeys.payouts, queryFn: endpoints.getPublisherPayouts })

export const useUpdatePayoutAccount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: endpoints.updatePayoutAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.payouts }),
  })
}

export const usePublisherSettings = () =>
  useQuery({ queryKey: queryKeys.settings, queryFn: endpoints.getPublisherSettings })

/** Wraps a settings call that returns the whole settings object, and caches the result. */
export function useSettingsMutation<V>(fn: (vars: V) => Promise<PublisherSettings>) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: (data) => qc.setQueryData(queryKeys.settings, data) })
}

export const useChangePassword = () => useMutation({ mutationFn: endpoints.changePassword })

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import * as endpoints from "@/lib/api/endpoints"

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
  publisherBatches: ["publisher-batches"] as const,
  catalog: ["publisher-catalog"] as const,
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

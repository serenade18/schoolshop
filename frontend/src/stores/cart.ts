import { create } from "zustand"
import { persist } from "zustand/middleware"

/**
 * The parent's in-progress order: which booklist they are buying for which
 * child, which items on it they unticked because the child already has them,
 * and any extra shop items (delivered to school with the same pack).
 */
type CartState = {
  studentId: string | null
  booklistId: string | null
  excludedItemIds: string[]
  /** productId → quantity */
  extras: Record<string, number>
  /** Begin an order for a child's list. Optional items start unticked. */
  start: (studentId: string, booklistId: string, optionalItemIds: string[]) => void
  toggleItem: (itemId: string) => void
  includeAll: () => void
  setExtraQty: (productId: string, qty: number) => void
  clear: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      studentId: null,
      booklistId: null,
      excludedItemIds: [],
      extras: {},
      start: (studentId, booklistId, optionalItemIds) => {
        const s = get()
        if (s.studentId === studentId && s.booklistId === booklistId) return
        set({ studentId, booklistId, excludedItemIds: optionalItemIds })
      },
      toggleItem: (itemId) =>
        set((s) => ({
          excludedItemIds: s.excludedItemIds.includes(itemId)
            ? s.excludedItemIds.filter((id) => id !== itemId)
            : [...s.excludedItemIds, itemId],
        })),
      includeAll: () => set({ excludedItemIds: [] }),
      setExtraQty: (productId, qty) =>
        set((s) => {
          const extras = { ...s.extras }
          if (qty > 0) extras[productId] = Math.min(qty, 20)
          else delete extras[productId]
          return { extras }
        }),
      clear: () => set({ studentId: null, booklistId: null, excludedItemIds: [], extras: {} }),
    }),
    { name: "schoolshop-cart" }
  )
)

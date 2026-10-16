import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { AuthTokens, Role, User } from "@/lib/api/schemas"

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  signIn: (tokens: AuthTokens) => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      signIn: ({ access, refresh, user }) =>
        set({ accessToken: access, refreshToken: refresh, user }),
      signOut: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: "schoolshop-auth" }
  )
)

/** Where each role lands after signing in. */
export const homeForRole: Record<Role, string> = {
  parent: "/parent",
  school_admin: "/school",
  teacher: "/school/collection",
  publisher: "/publisher",
  platform_admin: "/admin",
}

export function hasRole(user: User | null, roles: readonly Role[]) {
  return !!user && user.roles.some((r) => roles.includes(r))
}

import { Navigate, Outlet, useLocation } from "react-router"

import type { Role } from "@/lib/api/schemas"
import { hasRole, homeForRole, useAuthStore } from "@/stores/auth"

/** Gate a route subtree on the signed-in user's roles. */
export function RequireRole({ roles }: { roles: readonly Role[] }) {
  const user = useAuthStore((s) => s.user)
  const signedOut = useAuthStore((s) => s.signedOut)
  const location = useLocation()

  if (!user && signedOut) return <Navigate to="/" replace />
  if (!user) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />
  }
  if (!hasRole(user, roles)) {
    return <Navigate to={homeForRole[user.roles[0]]} replace />
  }
  return <Outlet />
}

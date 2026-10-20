import { useEffect, useState } from "react"
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router"
import { Lock, LogOut, Menu, X } from "lucide-react"

import { Logo } from "@/components/brand/Logo"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api/client"
import { useAdminOrgs, useMe } from "@/lib/api/queries"
import { useAccess } from "@/lib/useAccess"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth"

export type DashboardNavItem = {
  to: string
  label: string
  end?: boolean
  badge?: number
  /** Hidden from roles without it; opening it anyway shows "no access". */
  permission?: string
}

type DashboardLayoutProps = {
  /** Small tag next to the logo, e.g. "PUBLISHER". */
  tag?: string
  /** Dark sidebar for publisher and admin tools, light for schools. */
  tone?: "light" | "dark"
  nav: DashboardNavItem[]
  orgLabel?: string
}

/**
 * Shared shell for the school, publisher and admin dashboards.
 *
 * From lg the menu is a fixed sidebar. Below that it collapses into a top bar
 * with the current section's name and a menu button that opens the same nav.
 */
export function DashboardLayout({ tag, tone = "light", nav: allNav, orgLabel }: DashboardLayoutProps) {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const access = useAccess()
  const me = useRefreshAccess()
  // A session saved before roles existed has no permissions yet: wait for /me/ rather than flash "no access".
  const ready = access.roleId !== "" || me.isFetched
  // Applications waiting count live, so the badge drops as admins work through them.
  const orgs = useAdminOrgs(access.orgType === "platform" && access.can("orgs.view"))
  const waiting = orgs.data?.filter((o) => o.status === "pending" || o.status === "info_requested").length
  const nav = allNav
    .filter((n) => !n.permission || access.can(n.permission))
    .map((n) => (n.to === "/admin/organisations" && waiting !== undefined ? { ...n, badge: waiting } : n))
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null)
  const menuOpen = menuOpenOn === pathname
  const dark = tone === "dark"
  const org = user?.memberships[0]
  const current = [...nav].reverse().find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))
  // The page asked for, whether or not this role may open it.
  const requested = [...allNav].reverse().find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))
  const blocked = !!requested?.permission && !access.can(requested.permission)
  const alerts = nav.reduce((sum, n) => sum + (n.badge ?? 0), 0)


  const brand = (
    <div className="flex min-w-0 items-center gap-2.5">
      <Logo label="SchoolShop" className={cn("h-6 shrink-0", dark && "text-white")} />
      {tag && (
        <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-bold", dark ? "bg-sun text-ink" : "bg-secondary")}>
          {tag}
        </span>
      )}
    </div>
  )

  const menu = (
    <>
      {org && (
        <div className={cn("flex flex-col gap-0.5 rounded-xl p-3", dark ? "bg-white/10" : "bg-paper")}>
          <span className="text-[15px] font-semibold">{org.orgName}</span>
          <span className={cn("text-[13px]", dark ? "text-white/75" : "text-muted-foreground")}>
            {user?.name}{access.roleLabel ? ` · ${access.roleLabel}` : orgLabel ? ` · ${orgLabel}` : ""}
          </span>
        </div>
      )}
      <nav aria-label="Dashboard" className="flex flex-col gap-0.5">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex h-11 items-center justify-between rounded-lg px-3 text-[15px]",
                isActive
                  ? dark
                    ? "bg-white font-semibold text-ink"
                    : "bg-ink font-semibold text-white"
                  : cn("font-medium", dark ? "hover:bg-white/10" : "hover:bg-secondary")
              )
            }
          >
            {item.label}
            {!!item.badge && <span className="rounded-full bg-sun px-2 py-0.5 text-xs font-bold text-ink">{item.badge}</span>}
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        onClick={() => {
          signOut()
          navigate("/")
        }}
        className={cn(
          "flex h-11 items-center gap-2 rounded-lg px-3 text-[15px] font-medium lg:mt-auto",
          dark ? "text-white/80 hover:bg-white/10" : "text-muted-foreground hover:bg-secondary"
        )}
      >
        <LogOut className="size-4" aria-hidden /> Sign out
      </button>
    </>
  )

  return (
    <div className="flex min-h-dvh flex-col bg-paper lg:flex-row">
      {/* Phones and tablets: top bar plus a drop-down menu. */}
      <header className={cn("sticky top-0 z-30 lg:hidden", dark ? "bg-ink text-white" : "border-b bg-surface")}>
        <div className="flex h-15 items-center gap-3 px-4">
          {brand}
          {current && (
            <span className={cn("ml-1 hidden truncate border-l pl-3 text-[15px] font-semibold sm:block", dark ? "border-white/20" : "border-line")}>
              {current.label}
            </span>
          )}
          <button
            type="button"
            onClick={() => setMenuOpenOn(menuOpen ? null : pathname)}
            aria-expanded={menuOpen}
            aria-controls="dashboard-menu"
            aria-label={menuOpen ? "Close menu" : alerts ? `Open menu, ${alerts} items need attention` : "Open menu"}
            className={cn(
              "relative ml-auto flex size-11 shrink-0 items-center justify-center rounded-lg",
              dark ? "hover:bg-white/10" : "hover:bg-secondary"
            )}
          >
            {menuOpen ? <X className="size-5.5" aria-hidden /> : <Menu className="size-5.5" aria-hidden />}
            {!menuOpen && alerts > 0 && <span aria-hidden className="absolute top-2 right-2 size-2.5 rounded-full bg-sun" />}
          </button>
        </div>
        {menuOpen && (
          <div
            id="dashboard-menu"
            className={cn(
              "flex max-h-[calc(100dvh-60px)] flex-col gap-4 overflow-y-auto px-4 pt-1 pb-5",
              dark ? "border-t border-white/10" : "border-t"
            )}
          >
            {menu}
          </div>
        )}
      </header>

      {/* Desktop: fixed sidebar. */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto px-4 py-5.5 lg:flex",
          dark ? "bg-ink text-white" : "border-r bg-surface"
        )}
      >
        <div className="ml-2">{brand}</div>
        {menu}
      </aside>

      <main className="flex min-w-0 grow flex-col gap-6 px-[clamp(16px,3vw,40px)] py-6 md:py-8">
        {!ready ? null : !blocked ? (
          <Outlet />
        ) : requested?.end && nav[0] ? (
          // Landing on a home this role can't see: go to the first page it can.
          <Navigate to={nav[0].to} replace />
        ) : (
          <NoAccess page={requested?.label ?? "This page"} role={access.roleLabel} fallback={nav[0]} />
        )}
      </main>
    </div>
  )
}

function NoAccess({ page, role, fallback }: { page: string; role: string; fallback?: DashboardNavItem }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border bg-card px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary"><Lock className="size-5" aria-hidden /></span>
      <h1 className="text-2xl font-semibold">{page} isn't part of your role</h1>
      <p className="text-[15px] text-muted-foreground">
        {role ? `As ${/^[aeiou]/i.test(role) ? "an" : "a"} ${role}, you` : "You"} don't have access to this page. If you need it, ask an admin to change your role.
      </p>
      {fallback && (
        <Button asChild>
          <Link to={fallback.to}>Go to {fallback.label}</Link>
        </Button>
      )}
    </div>
  )
}

/** Re-reads the user's role and permissions from the API, so changes apply without signing in again. */
function useRefreshAccess() {
  const user = useAuthStore((s) => s.user)
  const me = useMe(!!user)
  useEffect(() => {
    if (me.data && JSON.stringify(me.data) !== JSON.stringify(useAuthStore.getState().user)) useAuthStore.setState({ user: me.data })
  }, [me.data])
  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 403) useAuthStore.getState().signOut()
  }, [me.error])
  return me
}

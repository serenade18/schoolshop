import { useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router"
import { LogOut, Menu, X } from "lucide-react"

import { Logo } from "@/components/brand/Logo"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth"

export type DashboardNavItem = { to: string; label: string; end?: boolean; badge?: number }

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
export function DashboardLayout({ tag, tone = "light", nav, orgLabel }: DashboardLayoutProps) {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null)
  const menuOpen = menuOpenOn === pathname
  const dark = tone === "dark"
  const org = user?.memberships[0]
  const current = [...nav].reverse().find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))
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
          <span className={cn("text-[13px]", dark ? "text-white/75" : "text-muted-foreground")}>{orgLabel ?? user?.name}</span>
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
        <Outlet />
      </main>
    </div>
  )
}

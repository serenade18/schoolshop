import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router"
import { Bell, HelpCircle, Home, LogOut, Package, User, Users } from "lucide-react"

import { Logo } from "@/components/brand/Logo"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth"
import "./parent-desktop.css"

const tabs = [
  { to: "/parent", label: "Home", icon: Home, end: true },
  { to: "/parent/orders", label: "Orders", icon: Package, end: false },
  { to: "/parent/children", label: "Children", icon: Users, end: false },
  { to: "/parent/account", label: "Account", icon: User, end: false },
]

/** How wide the content column gets on desktop. */
function contentWidth(pathname: string) {
  return /\/payments\//.test(pathname) ? "narrow" : "wide"
}

/**
 * Shell for parents. Phones get a brand header, content column and bottom tab bar.
 * From lg it becomes a sidebar plus a wide content area (see parent-desktop.css).
 */
export function ParentLayout() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <div className="parent-shell mx-auto flex min-h-dvh max-w-lg flex-col bg-paper md:border-x">
      {/* Desktop: fixed sidebar. */}
      <aside className="parent-sidebar">
        <Link to="/parent" aria-label="SchoolShop home" className="parent-sidebar__brand">
          <Logo label="" className="h-7" />
        </Link>
        <nav aria-label="Parent" className="parent-sidebar__nav">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cn("parent-side-link", isActive && "is-active")}>
              <Icon aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="parent-sidebar__foot">
          <Link to="/help" className="parent-tip">
            <HelpCircle aria-hidden />
            <span>
              <strong>Need a hand?</strong>
              <small>Help &amp; FAQs, refunds and contact</small>
            </span>
          </Link>
          <div className="parent-user">
            <span aria-hidden className="parent-user__avatar">{user?.name?.[0] ?? "P"}</span>
            <span className="parent-user__name">{user?.name ?? "Parent"}</span>
            <button type="button" aria-label="Notifications" className="parent-icon-btn">
              <Bell aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Sign out"
              className="parent-icon-btn"
              onClick={() => {
                signOut()
                navigate("/")
              }}
            >
              <LogOut aria-hidden />
            </button>
          </div>
        </div>
      </aside>

      <div className="parent-main">
        <header className="parent-mobile-header sticky top-0 z-10 flex items-center justify-between border-b bg-surface px-5 py-4">
          <Link to="/parent" aria-label="SchoolShop home">
            <Logo label="" className="h-6.5" />
          </Link>
          <button
            type="button"
            aria-label="Notifications"
            className="flex size-11 items-center justify-center rounded-full border bg-surface"
          >
            <Bell className="size-5" aria-hidden />
          </button>
        </header>
        <main className="parent-content grow px-5 pt-6 pb-28" data-width={contentWidth(pathname)}>
          <div key={pathname} className="parent-page">
            <Outlet />
          </div>
        </main>
        <nav
          aria-label="Parent"
          className="parent-mobile-nav fixed inset-x-0 bottom-0 z-10 mx-auto grid max-w-lg grid-cols-4 border-t bg-surface px-2 pt-1.5 pb-[max(1rem,env(safe-area-inset-bottom))] md:border-x"
        >
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2 text-xs",
                  isActive ? "font-bold text-ink" : "font-medium text-muted-ink"
                )
              }
            >
              <Icon className="size-5.5" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

/** Header for a parent sub-page: back link plus title. Rendered inside the page. */
export function ParentPageHeader({ back, title, subtitle }: { back: string; title: string; subtitle?: string }) {
  return (
    <div className="parent-page-header -mx-5 -mt-6 mb-5 flex items-center gap-2 border-b bg-surface px-3 py-3">
      <Link to={back} aria-label="Back" className="flex size-11 items-center justify-center rounded-full">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m15 6-6 6 6 6" />
        </svg>
      </Link>
      <div className="flex flex-col">
        <span className="font-display text-lg font-semibold">{title}</span>
        {subtitle && <span className="text-[13px] text-muted-foreground">{subtitle}</span>}
      </div>
    </div>
  )
}

import { NavLink, Outlet, useNavigate } from "react-router"
import { LogOut } from "lucide-react"

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
 * Shared shell for the school, publisher and admin dashboards: a side menu that
 * stacks above the content on narrow screens.
 */
export function DashboardLayout({ tag, tone = "light", nav, orgLabel }: DashboardLayoutProps) {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()
  const dark = tone === "dark"
  const org = user?.memberships[0]

  return (
    <div className="flex min-h-dvh flex-wrap items-stretch bg-paper">
      <aside
        className={cn(
          "flex max-w-full grow basis-56 flex-col gap-6 px-4 py-5.5 md:max-w-64",
          dark ? "bg-ink text-white" : "border-r bg-surface"
        )}
      >
        <div className="ml-2 flex items-center gap-2.5">
          <Logo label="SchoolShop" className={cn("h-6", dark && "text-white")} />
          {tag && (
            <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-bold", dark ? "bg-sun text-ink" : "bg-secondary")}>
              {tag}
            </span>
          )}
        </div>
        {org && (
          <div className={cn("flex flex-col gap-0.5 rounded-xl p-3", dark ? "bg-white/10" : "bg-paper")}>
            <span className="text-[15px] font-semibold">{org.orgName}</span>
            <span className={cn("text-[13px]", dark ? "text-white/75" : "text-muted-foreground")}>
              {orgLabel ?? user?.name}
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
              {!!item.badge && (
                <span className="rounded-full bg-sun px-2 py-0.5 text-xs font-bold text-ink">{item.badge}</span>
              )}
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
            "mt-auto flex h-11 items-center gap-2 rounded-lg px-3 text-[15px] font-medium",
            dark ? "text-white/80 hover:bg-white/10" : "text-muted-foreground hover:bg-secondary"
          )}
        >
          <LogOut className="size-4" aria-hidden /> Sign out
        </button>
      </aside>
      <main className="flex min-w-0 grow-[999] basis-[560px] flex-col gap-6 px-[clamp(16px,3vw,40px)] py-8">
        <Outlet />
      </main>
    </div>
  )
}

import { Link, NavLink, Outlet } from "react-router"
import { ShoppingCart } from "lucide-react"

import { Logo } from "@/components/brand/Logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { homeForRole, useAuthStore } from "@/stores/auth"

const links = [
  { to: "/shop", label: "Shop" },
  { to: "/schools/greenhill-academy", label: "Find your school" },
  { to: "/for-schools", label: "For schools" },
  { to: "/for-publishers", label: "For publishers" },
]

export function PublicLayout() {
  const user = useAuthStore((s) => s.user)
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-7 gap-y-3 px-5 py-3.5">
          <Link to="/" aria-label="SchoolShop home" className="flex">
            <Logo label="" />
          </Link>
          <nav aria-label="Main" className="flex grow flex-wrap gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-2.5 py-3 text-[15px] font-semibold text-ink",
                    isActive && "underline decoration-2 underline-offset-[6px]"
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2.5">
            {user ? (
              <Button asChild variant="outline">
                <Link to={homeForRole[user.roles[0]]}>My account</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to="/sign-in">Sign in</Link>
              </Button>
            )}
            <Button asChild aria-label="Cart">
              <Link to="/parent/checkout">
                <ShoppingCart aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="grow">
        <Outlet />
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground">
          <Logo className="h-5.5" />
          <nav aria-label="Footer" className="flex flex-wrap gap-5">
            <Link to="/help" className="text-ink/80 hover:underline">Help &amp; FAQs</Link>
            <Link to="/help" className="text-ink/80 hover:underline">Refunds</Link>
            <Link to="/help" className="text-ink/80 hover:underline">Privacy</Link>
            <Link to="/help" className="text-ink/80 hover:underline">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

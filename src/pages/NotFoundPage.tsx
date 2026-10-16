import { Link } from "react-router"

import { Logo } from "@/components/brand/Logo"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-paper px-5 text-center">
      <Logo />
      <h1 className="text-3xl font-semibold">We couldn't find that page</h1>
      <Button asChild>
        <Link to="/">Go to the home page</Link>
      </Button>
    </div>
  )
}

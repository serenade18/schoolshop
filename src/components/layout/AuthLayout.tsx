import type { ComponentProps, ReactNode } from "react"
import { Link } from "react-router"
import { Check, ChevronLeft } from "lucide-react"

import { Logo } from "@/components/brand/Logo"
import { cn } from "@/lib/utils"

export type AuthAside = {
  headline: string
  points: { title: string; detail: string }[]
  /** Numbered steps instead of ticks. */
  numbered?: boolean
}

const defaultAside: AuthAside = {
  headline: "Every school list, sorted.",
  points: [
    { title: "Parents", detail: "Pay with M-Pesa, collect at school." },
    { title: "Schools", detail: "Publish booklists, track orders and deliveries." },
    { title: "Publishers", detail: "Prepaid orders grouped per school, paid on delivery." },
  ],
}

/**
 * Shell for sign-in, sign-up and password screens.
 *
 * Phones get a single white column with a back button and the logo, matching
 * the parent app. From the lg breakpoint the brand panel appears on the left
 * and the form sits in a card on the right.
 */
export function AuthLayout({
  children,
  back,
  title,
  aside = defaultAside,
  wide = false,
}: {
  children: ReactNode
  /** Where the back button goes (a path, or a handler for in-page steps). Omit for entry screens. */
  back?: string | (() => void)
  /** Mobile top-bar title; the logo shows when there is none. */
  title?: string
  aside?: AuthAside
  /** Wider card for longer forms (organisation registration). */
  wide?: boolean
}) {
  return (
    <div className="flex min-h-dvh bg-surface lg:bg-paper">
      <aside className="sticky top-0 hidden h-dvh w-[clamp(400px,40vw,560px)] shrink-0 flex-col justify-between bg-ink p-12 text-white lg:flex">
        <Link to="/" className="flex flex-col gap-3.5 self-start" aria-label="SchoolShop home">
          <Logo label="" className="h-7 text-white" />
          <span className="h-1 w-16 rounded-full bg-linear-to-r from-sun to-flame" aria-hidden />
        </Link>
        <div className="flex flex-col gap-7">
          <p className="font-display text-[clamp(36px,3.4vw,46px)] leading-[1.08] font-semibold tracking-tight">{aside.headline}</p>
          <ul className="flex flex-col gap-4.5">
            {aside.points.map((p, i) => (
              <li key={p.title} className="flex items-start gap-3 text-[15px] leading-snug text-white/80">
                <span
                  aria-hidden
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full font-display text-[13px] font-bold text-ink",
                    aside.numbered ? "bg-white" : "bg-sun"
                  )}
                >
                  {aside.numbered ? i + 1 : <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span>
                  <span className="block text-base font-bold text-white">{p.title}</span>
                  {p.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <nav aria-label="Footer" className="flex gap-3 text-[13px] text-white/60">
          <span>© SchoolShop</span>
          <Link to="/help" className="hover:text-white">Help</Link>
          <Link to="/help" className="hover:text-white">Privacy</Link>
        </nav>
      </aside>

      <div className="flex min-w-0 grow flex-col">
        <header className="flex h-[69px] items-center gap-2 border-b px-3 lg:hidden">
          {back ? (
            <BackLink back={back} aria-label="Back" className="flex size-11 items-center justify-center rounded-full hover:bg-secondary">
              <ChevronLeft className="size-5.5" aria-hidden />
            </BackLink>
          ) : (
            <span className="w-2" />
          )}
          {title ? (
            <span className="font-display text-lg font-semibold">{title}</span>
          ) : (
            <Link to="/" aria-label="SchoolShop home">
              <Logo label="" className="h-6" />
            </Link>
          )}
        </header>
        <main className="flex grow justify-center px-5 py-7 sm:px-8 sm:py-10 lg:items-center lg:py-12">
          <div
            className={cn(
              "flex w-full flex-col gap-5 lg:rounded-3xl lg:border lg:bg-surface lg:p-9",
              wide ? "max-w-xl" : "max-w-md"
            )}
          >
            {back && (
              <BackLink
                back={back}
                className="-mt-2 hidden items-center gap-1 self-start text-sm font-semibold text-muted-foreground hover:text-ink lg:flex"
              >
                <ChevronLeft className="size-4" aria-hidden /> Back
              </BackLink>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

function BackLink({ back, ...props }: { back: string | (() => void) } & Omit<ComponentProps<"a">, "href">) {
  if (typeof back === "string") return <Link to={back} {...props} />
  return <button type="button" onClick={back} {...(props as ComponentProps<"button">)} />
}

/** Page heading used by every auth screen. */
export function AuthHeading({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {icon && (
        <span aria-hidden className="mb-3 flex size-[88px] items-center justify-center rounded-full bg-warn-bg text-accent-text [&_svg]:size-10">
          {icon}
        </span>
      )}
      <h1 className="text-[28px] leading-tight font-semibold">{title}</h1>
      {children && <p className="leading-normal text-muted-foreground">{children}</p>}
    </div>
  )
}

/** "or" rule between two ways of doing the same thing. */
export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 text-[13px] text-muted-foreground" role="separator">
      <span className="h-px grow bg-line" />
      or
      <span className="h-px grow bg-line" />
    </div>
  )
}

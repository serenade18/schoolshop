import type { ComponentType, ReactNode } from "react"
import { Link } from "react-router"
import { ArrowRight, Check, ChevronDown } from "lucide-react"

import { Reveal } from "@/components/common/Reveal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>

export type PartnerLandingContent = {
  eyebrow: string
  title: ReactNode
  lead: string
  /** Where "register" goes, e.g. /register?type=school. */
  registerTo: string
  registerLabel: string
  /** Illustration beside the hero copy (decorative). */
  preview: ReactNode
  /** Light tint behind the hero. */
  tone: "teal" | "orange"
  benefits: { title: string; body: string; icon: Icon }[]
  steps: { title: string; body: string }[]
  features: { title: string; body: string; icon: Icon }[]
  checklistTitle: string
  checklist: string[]
  faqs: { q: string; a: string }[]
  closingTitle: string
  closingBody: string
}

/**
 * Shared layout for the "For schools" and "For publishers" pages: hero with a
 * product preview, benefits, how it works, features, what you need, FAQs and a
 * closing call to action. Content comes from the page.
 */
export function PartnerLanding({ content: c }: { content: PartnerLandingContent }) {
  return (
    <>
      <section className={cn("border-b", c.tone === "teal" ? "bg-teal-light" : "bg-orange-light")}>
        <div className="mx-auto grid max-w-site items-center gap-10 px-5 lg:px-10 py-12 md:py-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
          <Reveal className="flex flex-col items-start gap-5">
            <span className="text-[13px] font-bold tracking-[0.08em] text-accent-text uppercase">{c.eyebrow}</span>
            <h1 className="text-[clamp(34px,5.4vw,56px)] leading-[1.05] font-semibold tracking-tight">{c.title}</h1>
            <p className="max-w-xl text-[17px] leading-relaxed text-ink/85">{c.lead}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={c.registerTo}>
                  {c.registerLabel} <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/sign-in">Sign in</Link>
              </Button>
            </div>
          </Reveal>
          <Reveal from="right" delay={150} className="w-full max-w-md justify-self-center lg:max-w-none">
            {c.preview}
          </Reveal>
        </div>
      </section>

      <section aria-label="Benefits" className="border-b">
        <div className="mx-auto grid max-w-site gap-6 px-5 lg:px-10 py-10 sm:grid-cols-3">
          {c.benefits.map(({ title, body, icon: Icon }, i) => (
            <Reveal key={title} delay={i * 110} className="flex items-start gap-3.5">
              <span aria-hidden className="pop-in flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-light">
                <Icon className="size-5.5 text-accent-text" aria-hidden />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-[17px] font-semibold">{title}</span>
                <span className="text-[15px] leading-relaxed text-muted-foreground">{body}</span>
              </span>
            </Reveal>
          ))}
        </div>
      </section>

      <section aria-labelledby="how-h" className="bg-teal text-white">
        <div className="mx-auto max-w-site px-5 lg:px-10 py-16">
          <Reveal>
            <h2 id="how-h" className="mb-10 text-[clamp(26px,4vw,34px)] font-semibold">How it works</h2>
          </Reveal>
          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {c.steps.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 120} className="flex flex-col gap-2.5">
                <span className="pop-in flex size-12 items-center justify-center rounded-full bg-sun font-display text-[22px] font-semibold text-ink">
                  {i + 1}
                </span>
                <span className="text-[18px] font-semibold">{s.title}</span>
                <span className="leading-relaxed text-white/90">{s.body}</span>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="features-h" className="mx-auto max-w-site px-5 lg:px-10 py-16">
        <Reveal className="mb-8 max-w-2xl">
          <h2 id="features-h" className="text-[clamp(26px,4vw,34px)] font-semibold">What you get</h2>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.features.map(({ title, body, icon: Icon }, i) => (
            <Reveal key={title} fill delay={(i % 3) * 90}>
              <div className="lift flex h-full flex-col gap-3 rounded-2xl border bg-surface p-5">
                <span className="lift__icon flex size-10 items-center justify-center rounded-xl bg-paper">
                  <Icon className="size-5 text-accent-text" aria-hidden />
                </span>
                <span className="text-[17px] font-semibold">{title}</span>
                <span className="text-[15px] leading-relaxed text-muted-foreground">{body}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section aria-labelledby="faq-h" className="border-t bg-paper">
        <div className="mx-auto grid max-w-site gap-10 px-5 lg:px-10 py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Reveal className="flex flex-col gap-4">
            <h2 className="text-[clamp(22px,3vw,26px)] font-semibold">{c.checklistTitle}</h2>
            <ul className="flex flex-col gap-3">
              {c.checklist.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] leading-relaxed">
                  <span aria-hidden className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-teal text-white">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120} className="flex flex-col gap-4">
            <h2 id="faq-h" className="text-[clamp(22px,3vw,26px)] font-semibold">Questions</h2>
            <div className="flex flex-col divide-y rounded-2xl border bg-surface">
              {c.faqs.map((f) => (
                <details key={f.q} className="group px-5">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-semibold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="pb-5 leading-relaxed text-ink/85">{f.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="closing-h" className="mx-auto max-w-site px-5 lg:px-10 py-16">
        <Reveal>
          <div className="flex flex-col items-start gap-5 rounded-3xl bg-ink p-8 text-white md:flex-row md:items-center md:justify-between md:p-12">
            <div className="flex max-w-xl flex-col gap-2">
              <h2 id="closing-h" className="text-[clamp(24px,3.6vw,32px)] font-semibold">{c.closingTitle}</h2>
              <p className="leading-relaxed text-white/85">{c.closingBody}</p>
            </div>
            <Button asChild size="lg" variant="brand" className="shrink-0">
              <Link to={c.registerTo}>
                {c.registerLabel} <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  )
}

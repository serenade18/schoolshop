import { Link } from "react-router"
import { ArrowRight, BookOpen, Check, GraduationCap, Library, PencilRuler, School } from "lucide-react"

import { GradientBar } from "@/components/common/GradientBar"
import { Reveal } from "@/components/common/Reveal"
import { ProductCard } from "@/components/common/ProductCard"
import { Button } from "@/components/ui/button"
import { useProducts } from "@/lib/api/queries"
import heroImage from "@/assets/home/hero.webp"
import "./hero.css"

const perks = [
  { title: "M-Pesa or card", body: "Pay in one step from your phone" },
  { title: "Free delivery to school", body: "Packed and labelled with your child's name" },
  { title: "The exact school list", body: "Set by the school, priced by publishers" },
]

const steps = [
  { title: "Find the school", body: "Search for your child's school and pick their grade. The list is the one the school published." },
  { title: "Pay with M-Pesa", body: "Untick what you already have and pay. You get an SMS receipt and a collection code." },
  { title: "Collect at school", body: "Publishers deliver to the school. Your child collects their labelled pack from the class teacher." },
]

export function HomePage() {
  const products = useProducts()
  return (
    <>
      <section className="hero">
        <img className="hero__bg" src={heroImage} alt="" aria-hidden width={828} height={552} fetchPriority="high" decoding="async" />
        <div className="hero__scrim" aria-hidden />
        <div className="hero__glow" aria-hidden />

        <div className="hero__inner">
          <div className="hero__copy">
            <span className="hero__eyebrow">Back to School. Without the Queues.</span>
            <h1 className="hero__title">
              Everything for School. <em>All in One Place.</em>
            </h1>
            <p className="hero__lead">
              From textbooks and stationery to everyday school essentials, find everything your child needs in one
              place. Shop by school, grade, or curriculum and enjoy a simpler, hassle-free back-to-school experience.
            </p>
            <div className="hero__ctas">
              <Link to="/schools" className="hero-btn hero-btn--primary">
                Find My School
                <ArrowRight className="hero-btn__icon" aria-hidden />
              </Link>
              <Link to="/shop?view=grade" className="hero-btn hero-btn--ghost">
                Shop by Grade
              </Link>
              <Link to="/shop" className="hero-btn hero-btn--ghost">
                Shop All
              </Link>
            </div>
          </div>

          <HeroListCard />
        </div>
        <div className="hero__bar" aria-hidden />
      </section>

      <section aria-label="Why SchoolShop" className="border-b">
        <div className="mx-auto grid max-w-site gap-4 px-5 lg:px-10 py-5.5 sm:grid-cols-3">
          {perks.map((p, i) => (
            <Reveal key={p.title} delay={i * 110} className="flex items-center gap-3">
              <span className="pop-in flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-light" aria-hidden>
                <Check className="size-5 text-accent-text" />
              </span>
              <span className="flex flex-col">
                <span className="text-[15px] font-semibold">{p.title}</span>
                <span className="text-sm text-muted-foreground">{p.body}</span>
              </span>
            </Reveal>
          ))}
        </div>
      </section>

      <section aria-labelledby="shop-categories-h" className="mx-auto max-w-site px-5 lg:px-10 pt-14 pb-2">
        <Reveal className="mb-6 max-w-2xl">
          <h2 id="shop-categories-h" className="text-[clamp(26px,4vw,32px)] font-semibold">Shop your way</h2>
          <p className="mt-2 text-ink/80">Find your school's approved list or browse our central catalogue by grade, curriculum or product type.</p>
        </Reveal>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { title: "Shop by School", body: "Approved school lists", to: "/schools", Icon: School },
            { title: "Shop by Grade", body: "Books by learning level", to: "/shop?view=grade", Icon: GraduationCap },
            { title: "Shop by Curriculum", body: "CBE, IGCSE, IB", to: "/shop?view=curriculum", Icon: BookOpen },
            { title: "College & University", body: "Higher education", to: "/shop?category=college", Icon: Library },
            { title: "Stationery & Supplies", body: "Everyday essentials", to: "/shop?category=stationery", Icon: PencilRuler },
          ].map(({ title, body, to, Icon }, i) => (
            <Reveal key={title} fill delay={i * 70}>
              <Link to={to} className="lift flex min-h-36 flex-col gap-3 rounded-2xl border bg-surface p-4 hover:border-ink/40">
                <span className="lift__icon flex size-10 items-center justify-center rounded-xl bg-teal-light"><Icon className="size-5 text-accent-text" aria-hidden /></span>
                <span className="font-semibold leading-tight">{title}</span>
                <span className="text-sm text-muted-foreground">{body}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section aria-labelledby="popular-h" className="mx-auto max-w-site px-5 lg:px-10 pt-10 pb-16">
        <Reveal className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="popular-h" className="text-[clamp(26px,4vw,32px)] font-semibold">Popular this term</h2>
          <Link to="/shop" className="py-2 text-[15px] font-semibold text-accent-text hover:underline">
            See the whole shop
          </Link>
        </Reveal>
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4 md:gap-5">
          {products.data?.results.slice(0, 4).map((p, i) => (
            <Reveal key={p.id} fill delay={i * 90}>
              <ProductCard product={p} index={i} />
            </Reveal>
          ))}
        </div>
      </section>

      <section aria-labelledby="how-h" className="bg-teal text-white">
        <div className="mx-auto max-w-site px-5 lg:px-10 py-16">
          <Reveal>
            <h2 id="how-h" className="mb-8 text-[clamp(26px,4vw,32px)] font-semibold">How it works</h2>
          </Reveal>
          <ol className="grid gap-7 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 140} className="flex flex-col gap-2.5">
                <span className="pop-in flex size-14 items-center justify-center rounded-full bg-sun font-display text-[26px] font-semibold text-ink">{i + 1}</span>
                <span className="text-[19px] font-semibold">{s.title}</span>
                <span className="leading-relaxed text-white/90">{s.body}</span>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section aria-label="For schools and publishers" className="mx-auto grid max-w-site gap-5 px-5 lg:px-10 py-16 md:grid-cols-2">
        <Reveal from="left" fill>
          <div className="flex flex-col items-start gap-3.5 rounded-3xl bg-teal-light p-8">
            <h2 className="text-[26px] font-semibold">For schools</h2>
            <p className="leading-relaxed text-ink/85">
              Publish each grade's booklist once. See who has ordered, receive one delivery per publisher and hand out
              labelled packs.
            </p>
            <Button asChild size="lg">
              <Link to="/for-schools">Register your school</Link>
            </Button>
          </div>
        </Reveal>
        <Reveal from="right" fill delay={120}>
          <div className="flex flex-col items-start gap-3.5 rounded-3xl bg-orange-light p-8">
            <h2 className="text-[26px] font-semibold">For publishers</h2>
            <p className="leading-relaxed text-ink/85">
              List your catalog once and get confirmed, prepaid orders grouped per school, with pick lists and payouts
              on delivery.
            </p>
            <Button asChild size="lg">
              <Link to="/for-publishers">Become a supplier</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  )
}

function HeroListCard() {
  return (
    <div aria-hidden className="hero-card">
      <div className="flex items-center justify-between gap-2">
        <span className="flex flex-col">
          <span className="font-display text-base font-semibold">Grade 4 · Term 1</span>
          <span className="text-xs text-muted-foreground">Greenhill Academy</span>
        </span>
        <span className="rounded-full bg-warn-bg px-2 py-0.5 text-[11px] font-bold text-warn-fg">List ready</span>
      </div>
      <GradientBar value={1} className="h-1" />
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">6 items · Total</span>
        <span className="font-display text-xl font-semibold">KES 3,750</span>
      </div>
      <div className="flex h-10 items-center justify-center rounded-xl bg-teal text-sm font-semibold text-white">Pay with M-Pesa</div>
    </div>
  )
}

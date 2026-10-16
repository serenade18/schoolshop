import { Link, useSearchParams } from "react-router"

import { ProductCard } from "@/components/common/ProductCard"
import { QueryBoundary } from "@/components/common/QueryBoundary"
import { Button } from "@/components/ui/button"
import { useProducts } from "@/lib/api/queries"
import { cn } from "@/lib/utils"
import { useCartStore } from "@/stores/cart"

const bands = [
  { id: "all", name: "All grades" },
  { id: "pp", name: "PP1–PP2" },
  { id: "1-3", name: "Grade 1–3" },
  { id: "4-6", name: "Grade 4–6" },
  { id: "7-9", name: "Grade 7–9" },
]

export function ShopPage() {
  const [params, setParams] = useSearchParams()
  const band = params.get("grade") ?? "all"
  const products = useProducts(band)
  const extras = useCartStore((s) => s.extras)
  const setExtraQty = useCartStore((s) => s.setExtraQty)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 pt-8 pb-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-[40px] font-semibold tracking-tight">Shop by grade</h1>
        <p className="text-ink/85">
          Buying for a school list?{" "}
          <Link to="/schools/greenhill-academy" className="font-semibold text-accent-text hover:underline">
            Find your school
          </Link>{" "}
          to get the exact items.
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-8">
        <aside aria-label="Filters" className="flex max-w-full grow basis-56 flex-col gap-6 md:max-w-60">
          <div role="group" aria-label="Grade" className="flex flex-col gap-1.5">
            <span className="mb-1 text-[13px] font-bold tracking-[0.06em] text-muted-foreground uppercase">Grade</span>
            {bands.map((b) => (
              <button
                key={b.id}
                type="button"
                aria-pressed={b.id === band}
                onClick={() => setParams(b.id === "all" ? {} : { grade: b.id })}
                className={cn(
                  "h-11 rounded-lg px-3.5 text-left text-[15px]",
                  b.id === band ? "bg-ink font-semibold text-white" : "border bg-surface font-medium hover:bg-paper"
                )}
              >
                {b.name}
              </button>
            ))}
          </div>
          <p className="rounded-xl bg-paper p-4 text-sm leading-relaxed text-ink/85">
            Shop items go in your child's pack and arrive with the school's next delivery.
          </p>
        </aside>
        <section aria-label="Products" className="flex min-w-0 grow-[999] basis-[560px] flex-col gap-4">
          <QueryBoundary query={products}>
            {(data) => (
              <>
                <span className="text-sm text-muted-foreground">{data.count} products</span>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-x-5 gap-y-6">
                  {data.results.map((p, i) => {
                    const added = !!extras[p.id]
                    return (
                      <ProductCard
                        key={p.id}
                        product={p}
                        index={i}
                        action={
                          <Button
                            size="sm"
                            variant={added ? "secondary" : "outline"}
                            aria-pressed={added}
                            onClick={() => setExtraQty(p.id, added ? 0 : 1)}
                          >
                            {added ? "Added" : "Add"}
                          </Button>
                        }
                      />
                    )
                  })}
                </div>
              </>
            )}
          </QueryBoundary>
        </section>
      </div>
    </div>
  )
}

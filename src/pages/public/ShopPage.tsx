import { Link, useSearchParams } from "react-router"
import { BookOpen, GraduationCap, Library, PencilRuler, School, Search } from "lucide-react"

import { ProductCard } from "@/components/common/ProductCard"
import { QueryBoundary } from "@/components/common/QueryBoundary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useProducts, type ProductFilters } from "@/lib/api/queries"
import { cn } from "@/lib/utils"
import { useCartStore } from "@/stores/cart"

const gradeBands = [
  { id: "all", name: "All grades" },
  { id: "pp", name: "PP1–PP2" },
  { id: "1-3", name: "Grade 1–3" },
  { id: "4-6", name: "Grade 4–6" },
  { id: "7-9", name: "Grade 7–9" },
]

const shopPaths = [
  { label: "Shop by School", description: "Buy your school's approved list", to: "/schools", icon: School },
  { label: "Shop by Grade", description: "Find books for a learning level", to: "/shop?view=grade", icon: GraduationCap },
  { label: "Shop by Curriculum", description: "CBE, IGCSE, IB and more", to: "/shop?view=curriculum", icon: BookOpen },
  { label: "College & University", description: "Books for higher education", to: "/shop?category=college", icon: Library },
  { label: "Stationery & Supplies", description: "Everyday learning essentials", to: "/shop?category=stationery", icon: PencilRuler },
  { label: "Shop All", description: "Explore the full catalogue", to: "/shop", icon: Search },
]

const curriculumNames: Record<string, string> = { cbe: "CBE (Kenya)", igcse: "IGCSE", ib: "International Baccalaureate (IB)" }

const titles: Record<string, string> = {
  all: "Shop all products",
  grade: "Shop by grade",
  curriculum: "Shop by curriculum",
  college: "College & University",
  stationery: "Stationery & Supplies",
  textbook: "Textbooks & Readers",
}

export function ShopPage() {
  const [params, setParams] = useSearchParams()
  const view = params.get("view") ?? "all"
  const category = params.get("category") ?? "all"
  const grade = params.get("grade") ?? "all"
  const curriculum = params.get("curriculum") ?? "cbe"
  const search = params.get("search") ?? ""
  const subject = params.get("subject") ?? ""
  const publisher = params.get("publisher") ?? ""
  const department = params.get("department") ?? ""
  const sort = params.get("sort") ?? "popular"
  const productsFilters: ProductFilters = {
    ...(view === "grade" && grade !== "all" ? { gradeBand: grade } : {}),
    ...(category !== "all" ? { category } : {}),
    ...(view === "curriculum" ? { curriculum } : {}),
    ...(search ? { search } : {}),
    ...(subject ? { subject } : {}),
    ...(publisher ? { publisher } : {}),
    ...(department ? { department } : {}),
    ...(sort ? { sort } : {}),
  }
  const products = useProducts(productsFilters)
  const extras = useCartStore((s) => s.extras)
  const setExtraQty = useCartStore((s) => s.setExtraQty)
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (!value || value === "all") next.delete(key)
    else next.set(key, value)
    setParams(next)
  }
  const title = view === "curriculum" ? `${curriculum.toUpperCase()} curriculum` : (category !== "all" ? (titles[category] ?? titles.all) : (titles[view] ?? titles.all))
  const curriculumLabel = curriculumNames[curriculum] ?? curriculum.toUpperCase()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7 px-5 pt-6 pb-16 md:pt-8">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-bold tracking-[0.08em] text-accent-text uppercase">The SchoolShop catalogue</p>
        <h1 className="text-[clamp(30px,5vw,40px)] leading-tight font-semibold tracking-tight">{title}</h1>
        <p className="max-w-3xl text-ink/80">Shop school books, curriculum resources and supplies from one catalogue. You can shop independently or find your school's approved list.</p>
      </header>

      <nav aria-label="Shop categories" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {shopPaths.map((path) => {
          const Icon = path.icon
          const active = path.to === "/shop" ? category === "all" && view === "all" : path.to.includes("/schools") ? false : path.to.includes("view=grade") ? view === "grade" : path.to.includes("view=curriculum") ? view === "curriculum" : path.to.includes("college") ? category === "college" : category === "stationery"
          return (
            <Link key={path.label} to={path.to} aria-current={active ? "page" : undefined} className={cn("flex min-h-28 flex-col gap-2 rounded-xl border p-3 transition-colors hover:border-ink/40 hover:bg-paper", active && "border-ink bg-paper")}>
              <Icon className="size-5 text-accent-text" aria-hidden />
              <span className="text-sm font-semibold leading-tight">{path.label}</span>
              <span className="text-xs leading-snug text-muted-foreground">{path.description}</span>
            </Link>
          )
        })}
      </nav>

      {view === "grade" && (
        <div className="flex flex-col gap-2">
          <label htmlFor="grade-filter" className="text-sm font-semibold">Learning level</label>
          <select id="grade-filter" value={grade} onChange={(e) => update("grade", e.target.value)} className="h-11 w-full max-w-sm rounded-lg border bg-surface px-3 text-sm">
            {gradeBands.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      )}

      {view === "curriculum" && (
        <div className="flex flex-col gap-2">
          <label htmlFor="curriculum-filter" className="text-sm font-semibold">Curriculum</label>
          <select id="curriculum-filter" value={curriculum} onChange={(e) => update("curriculum", e.target.value)} className="h-11 w-full max-w-sm rounded-lg border bg-surface px-3 text-sm">
            <option value="cbe">CBE (Kenya)</option>
            <option value="igcse">IGCSE</option>
            <option value="ib">International Baccalaureate (IB)</option>
          </select>
          <p className="text-sm text-muted-foreground">Selected: {curriculumLabel}. Results depend on the curricula assigned to products in the catalogue.</p>
        </div>
      )}

      {category === "stationery" && (
        <div className="flex flex-col gap-2">
          <label htmlFor="department-filter" className="text-sm font-semibold">Stationery department</label>
          <select id="department-filter" value={params.get("department") ?? ""} onChange={(e) => update("department", e.target.value)} className="h-11 w-full max-w-sm rounded-lg border bg-surface px-3 text-sm">
            <option value="">All stationery</option>
            <option value="writing">Writing & exercise books</option>
            <option value="maths">Maths & geometry</option>
            <option value="art">Art supplies</option>
          </select>
        </div>
      )}

      <section aria-label="Catalogue results" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input aria-label="Search products" value={search} onChange={(e) => update("search", e.target.value)} placeholder="Search titles, subjects, publishers" className="h-11 pl-10" />
          </div>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Filter by subject" value={subject} onChange={(e) => update("subject", e.target.value)} className="h-11 min-w-36 rounded-lg border bg-surface px-3 text-sm">
              <option value="">All subjects</option>
              {Array.from(new Set(products.data?.results.map((p) => p.subject) ?? [])).sort().map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select aria-label="Filter by publisher" value={publisher} onChange={(e) => update("publisher", e.target.value)} className="h-11 min-w-36 rounded-lg border bg-surface px-3 text-sm">
              <option value="">All publishers</option>
              {Array.from(new Set(products.data?.results.map((p) => p.publisherName) ?? [])).sort().map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select aria-label="Sort products" value={sort} onChange={(e) => update("sort", e.target.value)} className="h-11 rounded-lg border bg-surface px-3 text-sm">
              <option value="popular">Most popular</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="title">Name: A–Z</option>
            </select>
          </div>
        </div>

        {view === "all" && category === "all" && !search && (
          <p className="rounded-xl bg-paper p-4 text-sm text-ink/80">Buying for a school list? <Link to="/schools" className="font-semibold text-accent-text hover:underline">Find your school</Link> for the complete approved list.</p>
        )}

        <QueryBoundary query={products}>
          {(data) => (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{data.count} {data.count === 1 ? "product" : "products"}</p>
                {(search || subject || publisher || params.get("department")) && <Button variant="ghost" size="sm" onClick={() => setParams(new URLSearchParams([...params].filter(([key]) => !["search", "subject", "publisher", "department"].includes(key))))}>Clear filters</Button>}
              </div>
              {data.results.length ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
                  {data.results.map((product, index) => {
                    const added = !!extras[product.id]
                    return <ProductCard key={product.id} product={product} index={index} action={<Button size="sm" variant={added ? "secondary" : "outline"} aria-pressed={added} onClick={() => setExtraQty(product.id, added ? 0 : 1)}>{added ? "Added" : "Add"}</Button>} />
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-5 py-14 text-center">
                  <Library className="size-8 text-muted-foreground" aria-hidden />
                  <h2 className="text-lg font-semibold">No products found</h2>
                  <p className="max-w-md text-sm text-muted-foreground">Try changing your search or filters. More products can be added to this catalogue without duplicating existing listings.</p>
                  <Button variant="outline" onClick={() => setParams(view === "curriculum" ? { view, curriculum } : view === "grade" ? { view } : {})}>Reset filters</Button>
                </div>
              )}
            </>
          )}
        </QueryBoundary>
      </section>
    </div>
  )
}

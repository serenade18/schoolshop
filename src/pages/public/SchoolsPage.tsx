import { useState } from "react"
import { Link } from "react-router"
import { MapPin, Search, School } from "lucide-react"

import { Input } from "@/components/ui/input"
import { useSchools } from "@/lib/api/queries"

export function SchoolsPage() {
  const [search, setSearch] = useState("")
  const schools = useSchools(search)
  const results = schools.data?.results ?? []

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7 px-5 pt-8 pb-16">
      <header className="max-w-2xl">
        <p className="mb-2 text-sm font-bold tracking-[0.08em] text-accent-text uppercase">Approved school lists</p>
        <h1 className="text-[clamp(30px,5vw,40px)] font-semibold tracking-tight">Find your child's school</h1>
        <p className="mt-3 leading-relaxed text-ink/80">Choose a school to see its published booklists, select the correct grade and term, and shop the required items together.</p>
      </header>
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input aria-label="Search schools by name or town" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by school name or town" className="h-14 pl-12" />
      </div>
      {schools.isLoading ? <p className="text-sm text-muted-foreground">Loading schools…</p> : results.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((school) => (
            <Link key={school.id} to={`/schools/${school.slug}`} className="flex items-start gap-3 rounded-2xl border p-4 transition-colors hover:border-ink/40 hover:bg-paper">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-warn-bg"><School className="size-5 text-accent-text" aria-hidden /></span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-semibold">{school.name}</span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" aria-hidden />{school.town}, {school.county}</span>
                <span className="mt-1 text-sm font-semibold text-accent-text">View school lists →</span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed px-5 py-12 text-center">
          <h2 className="font-semibold">No matching schools</h2>
          <p className="mt-2 text-sm text-muted-foreground">Try another school name or town. If your school is missing, ask its administration to join SchoolShop.</p>
        </div>
      )}
      <div className="rounded-2xl bg-paper p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div><h2 className="font-semibold">Don't need a school list?</h2><p className="mt-1 text-sm text-ink/75">Browse books and supplies independently.</p></div>
        <Link to="/shop" className="mt-3 inline-flex font-semibold text-accent-text hover:underline sm:mt-0">Shop the full catalogue →</Link>
      </div>
    </div>
  )
}

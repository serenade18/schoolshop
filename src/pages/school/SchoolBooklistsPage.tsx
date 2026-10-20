import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { Dialog } from "radix-ui"
import { Plus, X } from "lucide-react"

import { PageHeader } from "@/components/common/PageHeader"
import { QueryBoundary } from "@/components/common/QueryBoundary"
import { StatCard } from "@/components/common/StatCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCreateBooklist, useMyBooklists } from "@/lib/api/queries"
import type { SchoolBooklists, SchoolGrade } from "@/lib/api/schemas"
import { formatDay, formatKes } from "@/lib/format"
import { cn } from "@/lib/utils"

const status = { published: ["Published", "success"], draft: ["Draft", "secondary"], closed: ["Closed", "secondary"] } as const

export function SchoolBooklistsPage() {
  const booklists = useMyBooklists()
  return <QueryBoundary query={booklists}>{(data) => <Booklists data={data} />}</QueryBoundary>
}

function Booklists({ data }: { data: SchoolBooklists }) {
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState<string | null>(() => (params.get("new") !== null ? (data.gradesWithoutList[0]?.gradeName ?? null) : null))
  const lists = [...data.lists].sort((a, b) => gradeRank(a.gradeName) - gradeRank(b.gradeName))
  const published = lists.filter((l) => l.status === "published")
  const covered = published.reduce((t, l) => t + l.students, 0)
  const openNew = (grade?: string) => setCreating(grade ?? data.gradesWithoutList[0]?.gradeName ?? null)

  return (
    <>
      <PageHeader
        eyebrow={`${data.termName} · one list per grade`}
        title="Booklists"
        actions={
          <Button onClick={() => openNew()} disabled={data.gradesWithoutList.length === 0}>
            <Plus aria-hidden /> New booklist
          </Button>
        }
      />

      <section aria-label="Key numbers" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <StatCard label="Published" value={published.length} hint="Parents can order from these" />
        <StatCard label="Drafts" value={lists.length - published.length} hint="Only staff can see drafts" />
        <StatCard label="Grades without a list" value={data.gradesWithoutList.length} hint={data.gradesWithoutList.map((g) => g.gradeName).join(", ") || "Every grade is covered"} />
        <StatCard label="Students covered" value={covered} hint="In grades with a published list" />
      </section>

      <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grade</TableHead>
              <TableHead>Classes</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Required pack</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Paid orders</TableHead>
              <TableHead>Order by</TableHead>
              <TableHead><span className="sr-only">Action</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lists.map((l) => {
              const [label, variant] = status[l.status]
              return (
                <TableRow key={l.id}>
                  <TableCell className="font-semibold">{l.gradeName}</TableCell>
                  <TableCell className="text-muted-foreground">{l.classNames.join(", ")}</TableCell>
                  <TableCell className="text-right">{l.itemCount}</TableCell>
                  <TableCell className="text-right font-medium">{formatKes(l.requiredTotalCents)}</TableCell>
                  <TableCell><Badge variant={variant}>{label}</Badge></TableCell>
                  <TableCell><Progress ordered={l.ordered} students={l.students} live={l.status === "published"} /></TableCell>
                  <TableCell>{formatDay(l.orderDeadline)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/school/booklists/${l.id}`} aria-label={`Edit ${l.gradeName} booklist`}>Edit</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col gap-2.5 md:hidden">
        {lists.map((l) => {
          const [label, variant] = status[l.status]
          return (
            <li key={l.id}>
              <Link to={`/school/booklists/${l.id}`} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
                <span className="flex items-start justify-between gap-3">
                  <span className="flex flex-col">
                    <span className="font-semibold">{l.gradeName}</span>
                    <span className="text-[13px] text-muted-foreground">{l.itemCount} items · {formatKes(l.requiredTotalCents)} required</span>
                  </span>
                  <Badge variant={variant}>{label}</Badge>
                </span>
                <Progress ordered={l.ordered} students={l.students} live={l.status === "published"} />
              </Link>
            </li>
          )
        })}
      </ul>

      {data.gradesWithoutList.length > 0 && (
        <section aria-labelledby="missing-h" className="flex flex-col gap-3 rounded-2xl border border-dashed bg-card p-4 md:p-5">
          <div className="flex flex-col gap-1">
            <h2 id="missing-h" className="font-display text-lg font-semibold">Grades without a list</h2>
            <p className="text-sm text-muted-foreground">Parents in these grades can't order through SchoolShop until you publish one.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.gradesWithoutList.map((g) => (
              <Button key={g.gradeName} variant="outline" size="sm" onClick={() => openNew(g.gradeName)}>
                <Plus aria-hidden /> {g.gradeName}
                <span className="font-normal text-muted-foreground">· {g.students} students</span>
              </Button>
            ))}
          </div>
        </section>
      )}

      <NewListDialog
        grades={data.gradesWithoutList}
        grade={creating}
        onGrade={setCreating}
        onClose={() => {
          setCreating(null)
          if (params.has("new")) setParams({}, { replace: true })
        }}
      />
    </>
  )
}

function Progress({ ordered, students, live }: { ordered: number; students: number; live: boolean }) {
  if (!live) return <span className="text-sm text-muted-foreground">Not open yet</span>
  const share = students ? ordered / students : 0
  return (
    <span className="flex min-w-36 flex-col gap-1">
      <span className="text-sm"><span className="font-semibold">{ordered}</span> <span className="text-muted-foreground">of {students}</span></span>
      <span className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
        <span className={cn("block h-full rounded-full bg-primary")} style={{ width: `${share * 100}%` }} />
      </span>
    </span>
  )
}

function NewListDialog({ grades, grade, onGrade, onClose }: { grades: SchoolGrade[]; grade: string | null; onGrade: (g: string) => void; onClose: () => void }) {
  const navigate = useNavigate()
  const create = useCreateBooklist()
  const chosen = grades.find((g) => g.gradeName === grade)
  return (
    <Dialog.Root open={grade !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-w-md -translate-y-1/2 flex-col gap-5 rounded-3xl bg-surface p-6 outline-none">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="font-display text-xl font-semibold">New booklist</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">Start a draft. Parents don't see it until you publish.</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close"><X aria-hidden /></Button>
            </Dialog.Close>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Grade</span>
            <NativeSelect value={grade ?? ""} onChange={(e) => onGrade(e.target.value)}>
              {grades.map((g) => <option key={g.gradeName}>{g.gradeName}</option>)}
            </NativeSelect>
          </label>
          {chosen && (
            <p className="rounded-xl bg-paper p-3.5 text-sm">
              Applies to <span className="font-semibold">{chosen.classNames.join(", ")}</span>: {chosen.students} students.
            </p>
          )}
          {create.error && <p role="alert" className="text-sm text-destructive">{create.error.message}</p>}
          <Button
            size="lg"
            disabled={!chosen || create.isPending}
            onClick={() => grade && create.mutate(grade, { onSuccess: (list) => navigate(`/school/booklists/${list.id}`) })}
          >
            {create.isPending ? "Creating…" : `Start ${grade ?? ""} list`}
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** PP1, PP2, Grade 1 … Grade 9 */
function gradeRank(g: string) {
  return (g.startsWith("PP") ? -10 : 0) + parseInt(g.replace(/\D/g, "") || "0")
}

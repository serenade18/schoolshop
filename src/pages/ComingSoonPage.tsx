import { PageHeader } from "@/components/common/PageHeader"

/** Placeholder for dashboard sections designed on the canvas but not built yet. */
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="rounded-2xl border border-dashed bg-card p-8 text-muted-foreground">
        This section is designed and comes in a later build step.
      </div>
    </>
  )
}

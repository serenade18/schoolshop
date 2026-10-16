import type { ReactNode } from "react"
import type { UseQueryResult } from "@tanstack/react-query"
import { AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Renders loading and error states for a query, and its children once data
 * is in. Keeps every page from re-implementing the same three branches.
 */
export function QueryBoundary<T>({
  query,
  children,
  fallback,
}: {
  query: UseQueryResult<T>
  children: (data: T) => ReactNode
  fallback?: ReactNode
}) {
  if (query.isPending) {
    return (
      fallback ?? (
        <div className="grid gap-3" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      )
    )
  }
  if (query.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="size-5 text-warn-fg" aria-hidden />
          Couldn't load this
        </div>
        <p className="text-sm text-muted-foreground">{query.error.message}</p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Try again
        </Button>
      </div>
    )
  }
  return <>{children(query.data)}</>
}

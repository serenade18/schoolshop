import type { ReactNode } from "react"

import type { Product } from "@/lib/api/schemas"
import { formatKes } from "@/lib/format"
import { cn } from "@/lib/utils"

const coverTones = ["bg-sun text-ink", "bg-ink text-white", "bg-[#f26a21] text-ink", "bg-[#fde7c8] text-ink"]

/** Placeholder cover until publishers upload real cover images. */
export function BookCover({ product, index = 0, className }: { product: Product; index?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex aspect-[3/4] flex-col justify-end gap-1.5 rounded-xl p-4",
        coverTones[index % coverTones.length],
        className
      )}
    >
      <span className="text-xs font-bold tracking-[0.08em] uppercase">{product.gradeLabel}</span>
      <span className="font-display text-xl leading-tight font-semibold">{product.subject}</span>
    </span>
  )
}

export function ProductCard({ product, action, index = 0 }: { product: Product; action?: ReactNode; index?: number }) {
  return (
    <article className="flex flex-col gap-2.5">
      <BookCover product={product} index={index} />
      <div className="flex flex-col gap-0.5">
        <h3 className="font-sans text-[15px] font-semibold">{product.title}</h3>
        <span className="text-sm text-muted-foreground">{product.publisherName}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">{formatKes(product.priceCents)}</span>
        {action}
      </div>
    </article>
  )
}

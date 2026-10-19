import type { ReactNode } from "react"
import { Link } from "react-router"

import type { Product } from "@/lib/api/schemas"
import { formatKes } from "@/lib/format"
import { cn } from "@/lib/utils"

const coverTones = ["bg-teal text-white", "bg-orange text-ink", "bg-teal-light text-ink", "bg-orange-light text-ink"]

/** Placeholder cover until publishers upload real cover images. */
export function BookCover({ product, index = 0, className }: { product: Product; index?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex aspect-[3/4] flex-col justify-end gap-1.5 rounded-xl p-3 sm:p-4",
        coverTones[index % coverTones.length],
        className
      )}
    >
      <span className="text-xs font-bold tracking-[0.08em] uppercase">{product.gradeLabel}</span>
      <span className="font-display text-lg leading-tight font-semibold break-words sm:text-xl">{product.subject}</span>
    </span>
  )
}

/** Shop tile. The cover and title open the product page; `action` sits beside the price. */
export function ProductCard({ product, action, index = 0 }: { product: Product; action?: ReactNode; index?: number }) {
  const href = `/shop/${product.id}`
  return (
    <article className="product-card group flex min-w-0 flex-col gap-2.5">
      <Link to={href} tabIndex={-1} aria-hidden className="product-cover block">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt=""
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none"
              const fallback = event.currentTarget.nextElementSibling as HTMLElement | null
              if (fallback) fallback.style.display = "flex"
            }}
            className="aspect-[3/4] w-full rounded-xl bg-paper object-cover"
          />
        ) : null}
        <span className="w-full" style={{ display: product.imageUrl ? "none" : "flex" }}>
          <BookCover product={product} index={index} className="w-full" />
        </span>
      </Link>
      <div className="flex flex-col gap-0.5">
        <h3 className="font-sans text-[15px] leading-snug font-semibold">
          <Link to={href} className="hover:underline">{product.title}</Link>
        </h3>
        <span className="text-sm text-muted-foreground">{product.publisherName}</span>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold">{formatKes(product.priceCents)}</span>
        {action}
      </div>
    </article>
  )
}

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function SectionLabel({ children, className, as: Tag = "h2" }: { children: ReactNode; className?: string; as?: "h2" | "h3" | "span" }) {
  return (
    <Tag className={cn("font-sans text-[13px] font-bold tracking-[0.06em] text-muted-foreground uppercase", className)}>
      {children}
    </Tag>
  )
}

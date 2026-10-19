import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/** Native select styled like <Input>, with a custom chevron so the arrow has proper padding. */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative w-full">
      <select
        data-slot="select"
        className={cn(
          "h-12 w-full appearance-none rounded-xl border border-input bg-surface pr-10 pl-3.5 text-base text-foreground outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </div>
  )
}

export { NativeSelect }

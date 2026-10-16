import { cn } from "@/lib/utils"

const steps = ["Review", "Pay", "Done"]

/** 0 = review, 1 = pay, 2 = done. */
export function CheckoutSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol aria-label="Checkout steps" className="grid grid-cols-3 gap-1.5">
      {steps.map((label, i) => (
        <li
          key={label}
          aria-current={i === current ? "step" : undefined}
          className={cn("flex flex-col gap-1.5 text-[13px]", i <= current ? "font-bold" : "font-medium text-muted-foreground")}
        >
          <span
            className={cn(
              "h-1 rounded-full",
              i < current ? "bg-ink" : i === current ? (current === 2 ? "bg-linear-to-r from-sun to-flame" : "bg-ink") : "bg-border"
            )}
          />
          {i + 1} {label}
        </li>
      ))}
    </ol>
  )
}

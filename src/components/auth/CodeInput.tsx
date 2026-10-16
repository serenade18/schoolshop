import { useState, type ComponentProps } from "react"

import { cn } from "@/lib/utils"

/**
 * Six-box one-time-code field. It is a single real input laid over the boxes,
 * so SMS autofill, paste and screen readers all behave like a normal field.
 */
export function CodeInput({
  value,
  onChange,
  className,
  length = 6,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: string
  onChange: (value: string) => void
  length?: number
}) {
  const [focused, setFocused] = useState(false)
  const invalid = props["aria-invalid"] === true || props["aria-invalid"] === "true"
  return (
    <div className={cn("relative grid gap-2", className)} style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}>
      {Array.from({ length }, (_, i) => {
        const active = focused && (i === value.length || (i === length - 1 && value.length === length))
        return (
          <span
            key={i}
            aria-hidden
            className={cn(
              "flex h-14 items-center justify-center rounded-xl border bg-surface font-display text-2xl font-semibold",
              active ? "border-2 border-ink" : invalid ? "border-destructive" : "border-input"
            )}
          >
            {value[i] ?? ""}
          </span>
        )
      })}
      <input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d*"
        maxLength={length}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        onFocus={(e) => {
          setFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          props.onBlur?.(e)
        }}
        className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
      />
    </div>
  )
}

/** "Resend code in 0:42" countdown, then a resend button. */
export function ResendCode({ secondsLeft, onResend, pending }: { secondsLeft: number; onResend: () => void; pending?: boolean }) {
  if (secondsLeft > 0) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Resend code in 0:{String(secondsLeft).padStart(2, "0")}
      </p>
    )
  }
  return (
    <button type="button" onClick={onResend} disabled={pending} className="self-start text-sm font-semibold text-accent-text underline-offset-4 hover:underline">
      {pending ? "Sending…" : "Send a new code"}
    </button>
  )
}

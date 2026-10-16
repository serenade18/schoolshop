import { Check, Circle } from "lucide-react"

import { passwordRules, passwordScore } from "@/lib/password"
import { cn } from "@/lib/utils"

const verdicts = ["Too short", "Weak", "Fair", "Good", "Strong"]
const hints = ["", "Add a number or symbol.", "Make it longer, 12+ characters is best.", "Mix upper and lower case to make it stronger.", ""]

export function PasswordStrength({ value, showRules = false }: { value: string; showRules?: boolean }) {
  const score = passwordScore(value)
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1 rounded-full", i < score ? (score === 4 ? "bg-flame" : "bg-sun") : "bg-line")} />
        ))}
      </div>
      {value && (
        <p className="text-[13px] text-muted-foreground" aria-live="polite">
          <span className="font-semibold text-ink">{verdicts[score]}.</span> {hints[score]}
        </p>
      )}
      {showRules && (
        <ul className="flex flex-col gap-1.5 text-[13px]">
          {passwordRules.map((r) => {
            const ok = r.test(value)
            return (
              <li key={r.id} className={cn("flex items-center gap-2", ok ? "text-success-fg" : "text-muted-foreground")}>
                {ok ? <Check className="size-4" strokeWidth={2.6} aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
                {r.label}
                <span className="sr-only">{ok ? "(met)" : "(not met)"}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

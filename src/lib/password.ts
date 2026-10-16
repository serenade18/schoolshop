import { z } from "zod"

/** Rules every new password must meet. The server enforces the same ones. */
export const passwordRules = [
  { id: "length", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { id: "mix", label: "A number or symbol", test: (v: string) => /[\d\W_]/.test(v) },
] as const

export const newPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .refine((v) => /[\d\W_]/.test(v), "Add a number or symbol")

/** 0–4: one point each for length ≥ 8, length ≥ 12, a number or symbol, and mixed case. */
export function passwordScore(value: string) {
  if (!value) return 0
  return [value.length >= 8, value.length >= 12, /[\d\W_]/.test(value), /[a-z]/.test(value) && /[A-Z]/.test(value)].filter(Boolean)
    .length
}

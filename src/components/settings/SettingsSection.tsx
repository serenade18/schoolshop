import type { ReactNode } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2 } from "lucide-react"
import { z } from "zod"

import { PasswordInput } from "@/components/auth/PasswordInput"
import { PasswordStrength } from "@/components/auth/PasswordStrength"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { ApiError } from "@/lib/api/client"
import { useChangePassword } from "@/lib/api/queries"
import { newPasswordSchema } from "@/lib/password"
import { errorText } from "@/lib/settings"

/*
 * Building blocks shared by the school and publisher settings pages.
 */

export function SettingsSection({ id, title, description, children, action }: { id: string; title: string; description: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 flex flex-col gap-5 rounded-2xl border bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={`${id}-h`} className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function SectionChips({ sections }: { sections: { id: string; label: string }[] }) {
  return (
    <nav aria-label="Settings sections" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
      {sections.map((s) => (
        <a key={s.id} href={`#${s.id}`} className="flex h-10 shrink-0 items-center rounded-full border bg-surface px-4 text-sm font-semibold hover:bg-paper">
          {s.label}
        </a>
      ))}
    </nav>
  )
}

export function Saved({ show, children = "Saved" }: { show: boolean; children?: ReactNode }) {
  if (!show) return null
  return (
    <span role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-success-fg">
      <CheckCircle2 className="size-4" aria-hidden /> {children}
    </span>
  )
}

const passwordFormSchema = z
  .object({ currentPassword: z.string().min(1, "Enter your current password"), newPassword: newPasswordSchema, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "The passwords don't match" })
type PasswordValues = z.infer<typeof passwordFormSchema>

export function ChangePasswordSection({ description }: { description: string }) {
  const form = useForm<PasswordValues>({ resolver: zodResolver(passwordFormSchema), defaultValues: { currentPassword: "", newPassword: "", confirm: "" } })
  const change = useChangePassword()
  const newPassword = useWatch({ control: form.control, name: "newPassword" })
  return (
    <SettingsSection id="security" title="Security" description={description}>
      <Form {...form}>
        <form
          noValidate
          className="flex max-w-md flex-col gap-4"
          onSubmit={form.handleSubmit(({ currentPassword, newPassword }) =>
            change.mutate(
              { currentPassword, newPassword },
              {
                onSuccess: () => form.reset(),
                onError: (e) => {
                  const f = e instanceof ApiError ? e.fieldErrors : {}
                  if (f.currentPassword) form.setError("currentPassword", { message: f.currentPassword[0] })
                  else if (f.newPassword) form.setError("newPassword", { message: f.newPassword[0] })
                  else form.setError("root", { message: errorText(e) })
                },
              }
            )
          )}
        >
          <FormField control={form.control} name="currentPassword" render={({ field }) => (
            <FormItem><FormLabel>Current password</FormLabel><FormControl><PasswordInput autoComplete="current-password" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="newPassword" render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl><PasswordInput autoComplete="new-password" {...field} /></FormControl>
              <PasswordStrength value={newPassword} showRules />
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="confirm" render={({ field }) => (
            <FormItem><FormLabel>Confirm new password</FormLabel><FormControl><PasswordInput autoComplete="new-password" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          {form.formState.errors.root && <p role="alert" className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={change.isPending}>{change.isPending ? "Updating…" : "Change password"}</Button>
            <Saved show={change.isSuccess}>Password changed</Saved>
          </div>
        </form>
      </Form>
    </SettingsSection>
  )
}

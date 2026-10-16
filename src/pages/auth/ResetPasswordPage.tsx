import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Link, Navigate, useLocation } from "react-router"
import { Check } from "lucide-react"
import { z } from "zod"

import { CodeInput, ResendCode } from "@/components/auth/CodeInput"
import { PasswordInput } from "@/components/auth/PasswordInput"
import { PasswordStrength } from "@/components/auth/PasswordStrength"
import { AuthHeading, AuthLayout } from "@/components/layout/AuthLayout"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useCountdown } from "@/hooks/useCountdown"
import { ApiError } from "@/lib/api/client"
import { requestPasswordReset, resetPassword } from "@/lib/api/endpoints"
import { newPasswordSchema } from "@/lib/password"
import type { ResetState } from "@/pages/auth/ForgotPasswordPage"

const schema = z
  .object({
    code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code we sent you"),
    password: newPasswordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don't match" })

export function ResetPasswordPage() {
  const state = useLocation().state as ResetState | null
  // The identifier only arrives from the forgot-password step; start there on a fresh visit.
  if (!state?.identifier) return <Navigate to="/forgot-password" replace />
  return <ResetForm {...state} />
}

function ResetForm({ identifier, channel, destination }: ResetState) {
  const countdown = useCountdown(45)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { code: "", password: "", confirm: "" } })
  const reset = useMutation({
    mutationFn: resetPassword,
    onError: (e) => {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) {
        for (const [field, messages] of Object.entries(e.fieldErrors)) {
          form.setError(field === "code" || field === "password" ? field : "root", { message: messages[0] })
        }
      } else form.setError("root", { message: e instanceof Error ? e.message : "Couldn't update your password" })
    },
  })
  const resend = useMutation({ mutationFn: () => requestPasswordReset(identifier), onSuccess: countdown.restart })
  const password = useWatch({ control: form.control, name: "password" })

  if (reset.isSuccess) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-4 py-10 text-center lg:py-4">
          <span aria-hidden className="flex size-20 items-center justify-center rounded-full bg-ink text-sun">
            <Check className="size-9" strokeWidth={2.6} />
          </span>
          <h1 className="text-[28px] leading-tight font-semibold">Password updated</h1>
          <p className="max-w-xs text-muted-foreground">
            You can now sign in with your new password. For your safety, we signed you out on other devices.
          </p>
          <Button asChild size="lg" className="mt-3 w-full">
            <Link to="/sign-in" replace>Sign in</Link>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout back="/forgot-password" title="New password">
      <Form {...form}>
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={form.handleSubmit(({ code, password }) => reset.mutate({ identifier, code, password }))}
        >
          <AuthHeading title="Set a new password">
            Enter the code we sent {channel === "email" ? "by email" : "by SMS"} to {destination}, then choose a new password.
          </AuthHeading>
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reset code</FormLabel>
                <FormControl>
                  <CodeInput autoFocus value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <ResendCode secondsLeft={countdown.secondsLeft} onResend={() => resend.mutate()} pending={resend.isPending} />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" {...field} />
                </FormControl>
                <PasswordStrength value={password} showRules />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm new password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.formState.errors.root && (
            <p role="alert" className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
          )}
          <Button type="submit" size="lg" disabled={reset.isPending}>
            {reset.isPending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  )
}

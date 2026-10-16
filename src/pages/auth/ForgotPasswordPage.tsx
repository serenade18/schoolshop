import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router"
import { Info, LockKeyhole } from "lucide-react"
import { z } from "zod"

import { AuthHeading, AuthLayout } from "@/components/layout/AuthLayout"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { ApiError } from "@/lib/api/client"
import { requestPasswordReset } from "@/lib/api/endpoints"
import { normaliseIdentifier } from "@/lib/format"

const schema = z.object({
  identifier: z.string().trim().refine((v) => normaliseIdentifier(v) !== null, "Enter your phone number, like 0712 345 678, or your email"),
})

/** State handed to the reset screen so it can say where the code went. */
export type ResetState = { identifier: string; channel: "sms" | "email"; destination: string }

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { identifier: "" } })
  const send = useMutation({
    mutationFn: requestPasswordReset,
    onError: (e) =>
      form.setError("identifier", {
        message: e instanceof ApiError ? (e.fieldErrors.identifier?.[0] ?? e.message) : "Couldn't send a reset code",
      }),
  })

  return (
    <AuthLayout back="/sign-in" title="Forgot password">
      <Form {...form}>
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={form.handleSubmit(({ identifier }) => {
            const id = normaliseIdentifier(identifier)!
            send.mutate(id, {
              onSuccess: (r) => navigate("/reset-password", { state: { identifier: id, channel: r.channel, destination: r.destination } satisfies ResetState }),
            })
          })}
        >
          <AuthHeading title="Reset your password" icon={<LockKeyhole strokeWidth={1.8} />}>
            Enter the phone number or email on your account. We'll send you a code to set a new password.
          </AuthHeading>
          <FormField
            control={form.control}
            name="identifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number or email</FormLabel>
                <FormControl>
                  <Input autoComplete="username" autoFocus placeholder="0712 345 678" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" size="lg" disabled={send.isPending}>
            {send.isPending ? "Sending…" : "Send reset code"}
          </Button>
          <p className="text-center text-[15px] text-muted-foreground">
            Remembered it?{" "}
            <Link to="/sign-in" className="font-semibold text-accent-text underline underline-offset-4">Back to sign in</Link>
          </p>
          <p className="mt-4 flex items-start gap-2.5 rounded-2xl bg-paper p-4 text-sm leading-normal text-ink/85">
            <Info className="mt-0.5 size-4.5 shrink-0" aria-hidden />
            No longer have that number? Contact your school or SchoolShop support to recover your account.
          </p>
        </form>
      </Form>
    </AuthLayout>
  )
}

import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router"
import { BookOpen, School, Smartphone, Users } from "lucide-react"
import { z } from "zod"

import { CodeInput, ResendCode } from "@/components/auth/CodeInput"
import { PasswordInput } from "@/components/auth/PasswordInput"
import { PasswordStrength } from "@/components/auth/PasswordStrength"
import { AuthHeading, AuthLayout } from "@/components/layout/AuthLayout"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useCountdown } from "@/hooks/useCountdown"
import { ApiError } from "@/lib/api/client"
import { registerParent, resendRegistrationCode, verifyRegistration } from "@/lib/api/endpoints"
import { normaliseKenyanPhone } from "@/lib/format"
import { newPasswordSchema } from "@/lib/password"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth"

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  phone: z.string().trim().refine((v) => normaliseKenyanPhone(v) !== null, "Enter a Kenyan mobile number, like 0712 345 678"),
  password: newPasswordSchema,
  terms: z.literal(true, "Accept the terms to continue"),
})

const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from the SMS") })

const roles = [
  { id: "parent", label: "Parent", hint: "Buy school lists", icon: Users, to: null },
  { id: "school", label: "School", hint: "Publish lists", icon: School, to: "/register?type=school" },
  { id: "publisher", label: "Publisher", hint: "Supply books", icon: BookOpen, to: "/register?type=publisher" },
] as const

const errorFor = (e: unknown, field: string, fallback: string) =>
  e instanceof ApiError ? (e.fieldErrors[field]?.[0] ?? e.message) : fallback

export function SignUpPage() {
  const [pending, setPending] = useState<{ phone: string; destination: string } | null>(null)

  return (
    <AuthLayout
      back={pending ? () => setPending(null) : "/sign-in"}
      title={pending ? "Verify your phone" : undefined}
      aside={{
        headline: "Your child's school list, delivered to school.",
        points: [
          { title: "The exact list", detail: "Set by the school, priced by the publishers." },
          { title: "M-Pesa or card", detail: "Pay in one step from your phone." },
          { title: "No courier fees", detail: "Your child collects their pack in class." },
        ],
      }}
    >
      {pending ? (
        <VerifyStep {...pending} onChangeNumber={() => setPending(null)} />
      ) : (
        <DetailsStep onSent={(phone, destination) => setPending({ phone, destination })} />
      )}
    </AuthLayout>
  )
}

function DetailsStep({ onSent }: { onSent: (phone: string, destination: string) => void }) {
  const navigate = useNavigate()
  const form = useForm<z.input<typeof signUpSchema>, unknown, z.output<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", phone: "", password: "", terms: false as unknown as true },
  })
  const register = useMutation({
    mutationFn: registerParent,
    onError: (e) => {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) {
        for (const [field, messages] of Object.entries(e.fieldErrors)) {
          if (field in signUpSchema.shape) form.setError(field as "phone", { message: messages[0] })
          else form.setError("root", { message: messages[0] })
        }
      } else form.setError("root", { message: errorFor(e, "", "Couldn't create your account") })
    },
  })
  const password = useWatch({ control: form.control, name: "password" })

  return (
    <Form {...form}>
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={form.handleSubmit(({ name, phone, password }) => {
          const e164 = normaliseKenyanPhone(phone)!
          register.mutate({ name, phone: e164, password }, { onSuccess: (r) => onSent(e164, r.destination) })
        })}
      >
        <AuthHeading title="Create your account">It takes a minute. You'll use it to buy your child's school list.</AuthHeading>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">I am a</legend>
          <div className="grid grid-cols-3 gap-2">
            {roles.map(({ id, label, hint, icon: Icon, to }) => {
              const on = id === "parent"
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => to && navigate(to)}
                  className={cn(
                    "flex min-w-0 flex-col items-start gap-1.5 rounded-2xl p-3 text-left transition-colors",
                    on ? "border-2 border-ink bg-[#fff8ee]" : "border bg-surface hover:bg-paper"
                  )}
                >
                  <span className={cn("flex size-8 items-center justify-center rounded-[10px]", on ? "bg-sun" : "bg-secondary")}>
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <span className="text-sm font-bold">{label}</span>
                  <span className="text-xs leading-tight text-muted-foreground">{hint}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="As it appears on your ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone number</FormLabel>
              <FormControl>
                <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" {...field} />
              </FormControl>
              <FormDescription>Use your M-Pesa number. We'll text you a code.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Create a password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" {...field} />
              </FormControl>
              <PasswordStrength value={password} />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="terms"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-start gap-2.5">
                <FormControl>
                  <Checkbox checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />
                </FormControl>
                <FormLabel className="text-sm leading-snug font-normal text-ink/85">
                  <span>
                    I agree to the{" "}
                    <Link to="/help" className="font-semibold text-accent-text underline underline-offset-4">Terms</Link> and{" "}
                    <Link to="/help" className="font-semibold text-accent-text underline underline-offset-4">Privacy Policy</Link>
                  </span>
                </FormLabel>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p role="alert" className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
        )}
        <Button type="submit" size="lg" disabled={register.isPending}>
          {register.isPending ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-[15px] text-muted-foreground">
          Already have an account?{" "}
          <Link to="/sign-in" className="font-semibold text-accent-text underline underline-offset-4">Sign in</Link>
        </p>
      </form>
    </Form>
  )
}

function VerifyStep({ phone, destination, onChangeNumber }: { phone: string; destination: string; onChangeNumber: () => void }) {
  const signIn = useAuthStore((s) => s.signIn)
  const navigate = useNavigate()
  const countdown = useCountdown(45)
  const form = useForm<z.infer<typeof codeSchema>>({ resolver: zodResolver(codeSchema), defaultValues: { code: "" } })
  const verify = useMutation({
    mutationFn: (code: string) => verifyRegistration(phone, code),
    onSuccess: (tokens) => {
      signIn(tokens)
      navigate("/parent", { replace: true })
    },
    onError: (e) => form.setError("code", { message: errorFor(e, "code", "Couldn't check the code") }),
  })
  const resend = useMutation({ mutationFn: () => resendRegistrationCode(phone), onSuccess: countdown.restart })

  return (
    <Form {...form}>
      <form noValidate className="flex flex-col gap-5" onSubmit={form.handleSubmit(({ code }) => verify.mutate(code))}>
        <AuthHeading title="Enter the 6-digit code" icon={<Smartphone strokeWidth={1.8} />}>
          We sent it by SMS to {destination}.
        </AuthHeading>
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">6-digit code</FormLabel>
              <FormControl>
                <CodeInput autoFocus value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <ResendCode secondsLeft={countdown.secondsLeft} onResend={() => resend.mutate()} pending={resend.isPending} />
        <Button type="submit" size="lg" disabled={verify.isPending}>
          {verify.isPending ? "Checking…" : "Verify and continue"}
        </Button>
        <p className="rounded-2xl bg-paper p-4 text-sm text-ink/85">
          Wrong number?{" "}
          <button type="button" onClick={onChangeNumber} className="font-semibold text-accent-text underline underline-offset-4">
            Change it
          </button>
        </p>
      </form>
    </Form>
  )
}

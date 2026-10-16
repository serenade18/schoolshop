import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Link, useLocation, useNavigate } from "react-router"
import { z } from "zod"

import { CodeInput, ResendCode } from "@/components/auth/CodeInput"
import { PasswordInput } from "@/components/auth/PasswordInput"
import { AuthDivider, AuthHeading, AuthLayout } from "@/components/layout/AuthLayout"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useCountdown } from "@/hooks/useCountdown"
import { ApiError } from "@/lib/api/client"
import { requestOtp, signInWithPassword, verifyOtp } from "@/lib/api/endpoints"
import type { AuthTokens } from "@/lib/api/schemas"
import { normaliseIdentifier, normaliseKenyanPhone } from "@/lib/format"
import { homeForRole, useAuthStore } from "@/stores/auth"

const passwordSchema = z.object({
  identifier: z.string().trim().refine((v) => normaliseIdentifier(v) !== null, "Enter your phone number, like 0712 345 678, or your email"),
  password: z.string().min(1, "Enter your password"),
})

const phoneSchema = z.object({
  phone: z.string().trim().refine((v) => normaliseKenyanPhone(v) !== null, "Enter a Kenyan mobile number, like 0712 345 678"),
})

const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from the SMS"),
})

const demoAccounts = [
  { label: "Parent", id: "0712 345 678" },
  { label: "School admin", id: "grace@greenhill.ac.ke" },
  { label: "Publisher", id: "0700 000 444" },
  { label: "Platform admin", id: "0799 000 999" },
]

const errorFor = (e: unknown, field: string, fallback: string) =>
  e instanceof ApiError ? (e.fieldErrors[field]?.[0] ?? e.message) : fallback

type Mode = { kind: "password" } | { kind: "otp-phone" } | { kind: "otp-code"; phone: string; destination: string }

export function SignInPage() {
  const [mode, setMode] = useState<Mode>({ kind: "password" })
  const signIn = useAuthStore((s) => s.signIn)
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from

  const done = (tokens: AuthTokens) => {
    signIn(tokens)
    navigate(from ?? homeForRole[tokens.user.roles[0]], { replace: true })
  }

  return (
    <AuthLayout
      back={mode.kind === "password" ? undefined : () => setMode(mode.kind === "otp-code" ? { kind: "otp-phone" } : { kind: "password" })}
      title={mode.kind === "otp-code" ? "Enter your code" : undefined}
    >
      {mode.kind === "password" && <PasswordStep onDone={done} onUseCode={() => setMode({ kind: "otp-phone" })} />}
      {mode.kind === "otp-phone" && (
        <PhoneStep
          onSent={(phone, destination) => setMode({ kind: "otp-code", phone, destination })}
          onUsePassword={() => setMode({ kind: "password" })}
        />
      )}
      {mode.kind === "otp-code" && (
        <CodeStep phone={mode.phone} destination={mode.destination} onBack={() => setMode({ kind: "otp-phone" })} onDone={done} />
      )}
      {import.meta.env.VITE_USE_MOCKS === "true" && mode.kind !== "otp-code" && (
        <div className="rounded-xl bg-paper p-4 text-sm">
          <p className="mb-2 font-semibold">Demo accounts · password schoolshop1 · code 123456</p>
          <ul className="grid gap-1 text-muted-foreground">
            {demoAccounts.map((a) => (
              <li key={a.id}>
                {a.label}: <span className="font-medium break-all text-ink">{a.id}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AuthLayout>
  )
}

function PasswordStep({ onDone, onUseCode }: { onDone: (t: AuthTokens) => void; onUseCode: () => void }) {
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { identifier: "", password: "" },
  })
  const login = useMutation({
    mutationFn: signInWithPassword,
    onSuccess: onDone,
    onError: (e) => {
      const message = errorFor(e, "password", "Couldn't sign you in")
      if (e instanceof ApiError && e.fieldErrors.identifier) form.setError("identifier", { message: e.fieldErrors.identifier[0] })
      else form.setError("password", { message })
    },
  })

  return (
    <Form {...form}>
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={form.handleSubmit(({ identifier, password }) =>
          login.mutate({ identifier: normaliseIdentifier(identifier)!, password })
        )}
      >
        <AuthHeading title="Welcome back">Sign in to see your children's lists and orders.</AuthHeading>
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone number or email</FormLabel>
              <FormControl>
                <Input autoComplete="username" placeholder="0712 345 678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-baseline justify-between gap-3">
                <FormLabel>Password</FormLabel>
                <Link to="/forgot-password" className="text-sm font-semibold text-accent-text underline underline-offset-4">
                  Forgot password?
                </Link>
              </div>
              <FormControl>
                <PasswordInput autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" disabled={login.isPending}>
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
        <AuthDivider />
        <Button type="button" size="lg" variant="outline" onClick={onUseCode}>
          Get a one-time code by SMS
        </Button>
        <p className="text-center text-[15px] text-muted-foreground">
          New to SchoolShop?{" "}
          <Link to="/sign-up" className="font-semibold text-accent-text underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </form>
    </Form>
  )
}

function PhoneStep({ onSent, onUsePassword }: { onSent: (phone: string, destination: string) => void; onUsePassword: () => void }) {
  const form = useForm<z.infer<typeof phoneSchema>>({ resolver: zodResolver(phoneSchema), defaultValues: { phone: "" } })
  const send = useMutation({
    mutationFn: requestOtp,
    onError: (e) => form.setError("phone", { message: errorFor(e, "phone", "Couldn't send the code") }),
  })

  return (
    <Form {...form}>
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={form.handleSubmit(({ phone }) => {
          const e164 = normaliseKenyanPhone(phone)!
          send.mutate(e164, { onSuccess: (r) => onSent(e164, r.destination) })
        })}
      >
        <AuthHeading title="Sign in with a code">We'll text a one-time code to your phone. No password needed.</AuthHeading>
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone number</FormLabel>
              <FormControl>
                <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" disabled={send.isPending}>
          {send.isPending ? "Sending code…" : "Send code"}
        </Button>
        <Button type="button" variant="link" onClick={onUsePassword}>
          Use my password instead
        </Button>
      </form>
    </Form>
  )
}

function CodeStep({
  phone,
  destination,
  onBack,
  onDone,
}: {
  phone: string
  destination: string
  onBack: () => void
  onDone: (t: AuthTokens) => void
}) {
  const form = useForm<z.infer<typeof codeSchema>>({ resolver: zodResolver(codeSchema), defaultValues: { code: "" } })
  const countdown = useCountdown(45)
  const verify = useMutation({
    mutationFn: (code: string) => verifyOtp(phone, code),
    onSuccess: onDone,
    onError: (e) => form.setError("code", { message: errorFor(e, "code", "Couldn't check the code") }),
  })
  const resend = useMutation({ mutationFn: () => requestOtp(phone), onSuccess: countdown.restart })

  return (
    <Form {...form}>
      <form noValidate className="flex flex-col gap-5" onSubmit={form.handleSubmit(({ code }) => verify.mutate(code))}>
        <AuthHeading title="Enter the 6-digit code">We sent it by SMS to {destination}.</AuthHeading>
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
          {verify.isPending ? "Checking…" : "Sign in"}
        </Button>
        <Button type="button" variant="link" onClick={onBack}>
          Use a different number
        </Button>
      </form>
    </Form>
  )
}

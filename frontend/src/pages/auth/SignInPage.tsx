import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Link, useLocation, useNavigate } from "react-router"
import { z } from "zod"

import { Logo } from "@/components/brand/Logo"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { ApiError } from "@/lib/api/client"
import { requestOtp, verifyOtp } from "@/lib/api/endpoints"
import { maskPhone, normaliseKenyanPhone } from "@/lib/format"
import { homeForRole, useAuthStore } from "@/stores/auth"

const phoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .refine((v) => normaliseKenyanPhone(v) !== null, "Enter a Kenyan mobile number, like 0712 345 678"),
})

const codeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from the SMS"),
})

const demoAccounts = [
  { label: "Parent", phone: "0712 345 678" },
  { label: "School admin", phone: "0722 000 111" },
  { label: "Publisher", phone: "0700 000 444" },
  { label: "Platform admin", phone: "0799 000 999" },
]

export function SignInPage() {
  const [phone, setPhone] = useState<string | null>(null)
  const signIn = useAuthStore((s) => s.signIn)
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from

  return (
    <div className="flex min-h-dvh items-start justify-center bg-paper px-5 py-12 md:items-center">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-3xl border bg-surface p-7">
        <Link to="/" aria-label="SchoolShop home" className="self-start">
          <Logo label="" />
        </Link>
        {phone ? (
          <CodeStep
            phone={phone}
            onBack={() => setPhone(null)}
            onVerified={(tokens) => {
              signIn(tokens)
              navigate(from ?? homeForRole[tokens.user.roles[0]], { replace: true })
            }}
          />
        ) : (
          <PhoneStep onSent={setPhone} />
        )}
        {import.meta.env.VITE_USE_MOCKS === "true" && !phone && (
          <div className="rounded-xl bg-paper p-4 text-sm">
            <p className="mb-2 font-semibold">Demo accounts (code 123456)</p>
            <ul className="grid gap-1 text-muted-foreground">
              {demoAccounts.map((a) => (
                <li key={a.phone}>
                  {a.label}: <span className="font-medium text-ink">{a.phone}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function PhoneStep({ onSent }: { onSent: (phone: string) => void }) {
  const form = useForm<z.infer<typeof phoneSchema>>({ resolver: zodResolver(phoneSchema), defaultValues: { phone: "" } })
  const send = useMutation({
    mutationFn: (phone: string) => requestOtp(phone),
    onError: (e) => form.setError("phone", { message: e instanceof ApiError ? (e.fieldErrors.phone?.[0] ?? e.message) : "Couldn't send the code" }),
  })

  return (
    <Form {...form}>
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={form.handleSubmit(({ phone }) => {
          const e164 = normaliseKenyanPhone(phone)!
          send.mutate(e164, { onSuccess: () => onSent(e164) })
        })}
      >
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px] leading-tight font-semibold">Sign in</h1>
          <p className="text-muted-foreground">We'll text you a one-time code. No password needed.</p>
        </div>
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
      </form>
    </Form>
  )
}

function CodeStep({
  phone,
  onBack,
  onVerified,
}: {
  phone: string
  onBack: () => void
  onVerified: (tokens: Awaited<ReturnType<typeof verifyOtp>>) => void
}) {
  const form = useForm<z.infer<typeof codeSchema>>({ resolver: zodResolver(codeSchema), defaultValues: { code: "" } })
  const verify = useMutation({
    mutationFn: (code: string) => verifyOtp(phone, code),
    onSuccess: onVerified,
    onError: (e) => form.setError("code", { message: e instanceof ApiError ? (e.fieldErrors.code?.[0] ?? e.message) : "Couldn't check the code" }),
  })

  return (
    <Form {...form}>
      <form noValidate className="flex flex-col gap-5" onSubmit={form.handleSubmit(({ code }) => verify.mutate(code))}>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px] leading-tight font-semibold">Enter your code</h1>
          <p className="text-muted-foreground">Sent by SMS to {maskPhone(phone)}.</p>
        </div>
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>6-digit code</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="font-display text-2xl tracking-[0.3em]"
                  {...field}
                />
              </FormControl>
              <FormDescription>The code expires after 5 minutes.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
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

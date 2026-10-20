import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router"
import { BadgeCheck, Lock, LogOut } from "lucide-react"
import { z } from "zod"

import { QueryBoundary } from "@/components/common/QueryBoundary"
import { ChangePasswordSection, Saved, SettingsSection } from "@/components/settings/SettingsSection"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import * as endpoints from "@/lib/api/endpoints"
import { useAccount, useAccountMutation, useRequestDeletion } from "@/lib/api/queries"
import type { Account } from "@/lib/api/schemas"
import { formatDayLong, normaliseKenyanPhone } from "@/lib/format"
import { errorText, showContact } from "@/lib/settings"
import { useAuthStore } from "@/stores/auth"

export function AccountPage() {
  const account = useAccount()
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] leading-tight font-semibold">Account</h1>
        <p className="text-[15px] text-muted-foreground">Your details, how you pay and what we send you.</p>
      </div>
      <QueryBoundary query={account}>
        {(a) => (
          <div className="flex flex-col gap-5">
            <ProfileSection account={a} />
            <NotificationsSection account={a} />
            <ChangePasswordSection description="You can also sign in with a one-time code sent to your phone." />
            <LeaveSection />
          </div>
        )}
      </QueryBoundary>
    </div>
  )
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: z.union([z.literal(""), z.email("Enter a valid email or leave it empty")]),
  mpesaPhone: z.string().trim().refine((v) => normaliseKenyanPhone(v) !== null, "Enter a Kenyan mobile number"),
})
type ProfileValues = z.infer<typeof profileSchema>

function ProfileSection({ account }: { account: Account }) {
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: account.name, email: account.email ?? "", mpesaPhone: showContact(account.mpesaPhone) },
  })
  const save = useAccountMutation(endpoints.updateAccount)
  return (
    <SettingsSection id="profile" title="Your details" description={`On SchoolShop since ${formatDayLong(account.memberSince)}.`}>
      <div className="flex flex-col gap-1 rounded-xl bg-paper p-4">
        <span className="text-sm text-muted-foreground">Phone number</span>
        <span className="flex flex-wrap items-center gap-2 font-semibold">
          {showContact(account.phone)} <Badge variant="success"><BadgeCheck aria-hidden /> Verified</Badge>
        </span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="size-4 shrink-0" aria-hidden /> You sign in with this number. To change it, contact SchoolShop support.</span>
      </div>
      <Form {...form}>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((v) =>
            save.mutate(
              { name: v.name, email: v.email || null, mpesaPhone: normaliseKenyanPhone(v.mpesaPhone)! },
              { onSuccess: () => form.reset(v), onError: (e) => form.setError("root", { message: errorText(e) }) }
            )
          )}
        >
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Full name</FormLabel><FormControl><Input autoComplete="name" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email (optional)</FormLabel><FormControl><Input type="email" autoComplete="email" {...field} /></FormControl><FormDescription>For receipts, if you want them.</FormDescription><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="mpesaPhone" render={({ field }) => (
            <FormItem className="sm:max-w-sm">
              <FormLabel>M-Pesa number for payments</FormLabel>
              <FormControl><Input type="tel" inputMode="tel" {...field} /></FormControl>
              <FormDescription>Filled in at checkout. You can still pay from another number. We never see your PIN.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          {form.formState.errors.root && <p role="alert" className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={save.isPending || !form.formState.isDirty}>{save.isPending ? "Saving…" : "Save changes"}</Button>
            <Saved show={save.isSuccess && !form.formState.isDirty} />
          </div>
        </form>
      </Form>
    </SettingsSection>
  )
}

const prefs: { id: keyof Account["notifications"]; label: string; hint: string }[] = [
  { id: "reminders", label: "Reminders before a list closes", hint: "An SMS a few days before the order deadline, if you haven't ordered." },
  { id: "emailReceipts", label: "Email receipts", hint: "A copy of each M-Pesa receipt by email." },
  { id: "offers", label: "Offers and new titles", hint: "Occasional SMS about discounts on books your children need." },
]

function NotificationsSection({ account }: { account: Account }) {
  const [draft, setDraft] = useState(account.notifications)
  const save = useAccountMutation(endpoints.updateAccountNotifications)
  const dirty = JSON.stringify(draft) !== JSON.stringify(account.notifications)
  return (
    <SettingsSection id="notifications" title="Messages" description="Order, payment and collection SMSes always go out. These are up to you.">
      <ul className="flex flex-col divide-y rounded-xl border">
        {prefs.map((p) => {
          const blocked = p.id === "emailReceipts" && !account.email
          return (
            <li key={p.id}>
              <label htmlFor={`pref-${p.id}`} className="flex cursor-pointer items-center justify-between gap-4 p-4">
                <span className="flex flex-col">
                  <span className="font-medium">{p.label}</span>
                  <span className="text-sm text-muted-foreground">{blocked ? "Add an email address above first." : p.hint}</span>
                </span>
                <Switch id={`pref-${p.id}`} checked={draft[p.id]} disabled={blocked} onCheckedChange={(on) => setDraft({ ...draft, [p.id]: on })} />
              </label>
            </li>
          )
        })}
      </ul>
      {save.error && <p role="alert" className="text-sm font-medium text-destructive">{errorText(save.error, "emailReceipts")}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!dirty || save.isPending} onClick={() => save.mutate(draft)}>{save.isPending ? "Saving…" : "Save"}</Button>
        <Saved show={save.isSuccess && !dirty} />
      </div>
    </SettingsSection>
  )
}

function LeaveSection() {
  const navigate = useNavigate()
  const signOut = useAuthStore((s) => s.signOut)
  const deletion = useRequestDeletion()
  return (
    <SettingsSection id="leave" title="Sign out or close your account" description="Closing your account removes your children and order history after any refunds are settled.">
      {deletion.isSuccess && <p role="status" className="rounded-xl bg-info-bg p-3.5 text-sm text-info-fg">Request received. We'll SMS you within 2 working days to confirm before anything is deleted.</p>}
      {deletion.error && <p role="alert" className="rounded-xl bg-warn-bg p-3.5 text-sm text-warn-fg">{errorText(deletion.error)}</p>}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => { signOut(); navigate("/") }}><LogOut aria-hidden /> Sign out</Button>
        <Button
          variant="ghost"
          className="text-destructive hover:bg-destructive/10"
          disabled={deletion.isPending || deletion.isSuccess}
          onClick={() => window.confirm("Ask SchoolShop to close your account?") && deletion.mutate()}
        >
          Close my account
        </Button>
      </div>
    </SettingsSection>
  )
}

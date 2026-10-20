import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { BadgeCheck, Lock } from "lucide-react"
import { z } from "zod"

import { PageHeader } from "@/components/common/PageHeader"
import { QueryBoundary } from "@/components/common/QueryBoundary"
import { ChangePasswordSection, Saved, SectionChips, SettingsSection } from "@/components/settings/SettingsSection"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { NativeSelect } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import * as endpoints from "@/lib/api/endpoints"
import { useSchoolSettings, useSchoolSettingsMutation } from "@/lib/api/queries"
import type { SchoolSettings } from "@/lib/api/schemas"
import { formatDayLong, normaliseKenyanPhone } from "@/lib/format"
import { counties, errorText, showContact } from "@/lib/settings"

const sections = [
  { id: "school", label: "School" },
  { id: "parents", label: "Parents & collection" },
  { id: "security", label: "Security" },
]

export function SchoolSettingsPage() {
  const settings = useSchoolSettings()
  return (
    <>
      <PageHeader eyebrow="Your school, your staff and how parents hear from you" title="Settings" />
      <SectionChips sections={sections} />
      <QueryBoundary query={settings}>
        {(data) => (
          <div className="flex max-w-4xl flex-col gap-6">
            <SchoolSection data={data} />
            <ParentsSection value={data.parents} />
            <ChangePasswordSection description="Your own sign-in. Each staff member has their own password." />
          </div>
        )}
      </QueryBoundary>
    </>
  )
}

/* ── School ──────────────────────────────────────────────────── */

const profileSchema = z.object({
  contactName: z.string().trim().min(2, "Enter a contact name"),
  phone: z.string().trim().refine((v) => normaliseKenyanPhone(v) !== null, "Enter a Kenyan mobile number"),
  email: z.email("Enter the school's email"),
  county: z.string().min(1, "Choose a county"),
  deliveryAddress: z.string().trim().min(5, "Tell publishers where to deliver"),
  deliveryHours: z.string().trim().min(3, "When can deliveries be received?"),
})
type ProfileValues = z.infer<typeof profileSchema>

function SchoolSection({ data }: { data: SchoolSettings }) {
  const p = data.profile
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { contactName: p.contactName, phone: showContact(p.phone), email: p.email, county: p.county, deliveryAddress: p.deliveryAddress, deliveryHours: p.deliveryHours },
  })
  const save = useSchoolSettingsMutation(endpoints.updateSchoolProfile)

  return (
    <SettingsSection id="school" title="School profile" description="Parents see your school's name. Publishers use the delivery details for every drop.">
      <div className="grid gap-3 rounded-xl bg-paper p-4 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-muted-foreground">School name</span>
          <span className="flex items-center gap-2 font-semibold">
            {p.schoolName}
            {p.verifiedAt && <Badge variant="success"><BadgeCheck aria-hidden /> Verified</Badge>}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-muted-foreground">Ministry of Education registration</span>
          <span className="font-mono font-semibold">{p.registrationNo}</span>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
          <Lock className="size-4 shrink-0" aria-hidden />
          {p.verifiedAt ? `Verified on ${formatDayLong(p.verifiedAt.slice(0, 10))}. ` : ""}To change these, contact SchoolShop support.
        </p>
      </div>
      <Form {...form}>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((v) =>
            save.mutate(
              { ...v, phone: normaliseKenyanPhone(v.phone)!, email: v.email.toLowerCase() },
              { onSuccess: () => form.reset(v), onError: (e) => form.setError("root", { message: errorText(e) }) }
            )
          )}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="contactName" render={({ field }) => (
              <FormItem><FormLabel>Contact person</FormLabel><FormControl><Input autoComplete="name" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" inputMode="tel" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>School email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="county" render={({ field }) => (
              <FormItem><FormLabel>County</FormLabel><FormControl>
                <NativeSelect {...field}>{counties.map((c) => <option key={c}>{c}</option>)}</NativeSelect>
              </FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="deliveryAddress" render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery address</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormDescription>Printed on every publisher's delivery note. Mention the gate or office to use.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="deliveryHours" render={({ field }) => (
            <FormItem className="sm:max-w-sm">
              <FormLabel>Deliveries received</FormLabel>
              <FormControl><Input placeholder="Mon–Fri, 8am–4pm" {...field} /></FormControl>
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

/* ── Parents & collection ────────────────────────────────────── */

const reminderOptions = [
  { days: 0, label: "Don't send reminders" },
  { days: 1, label: "1 day before the deadline" },
  { days: 3, label: "3 days before the deadline" },
  { days: 5, label: "5 days before the deadline" },
  { days: 7, label: "A week before the deadline" },
]

function ParentsSection({ value }: { value: SchoolSettings["parents"] }) {
  const [draft, setDraft] = useState(value)
  const save = useSchoolSettingsMutation(endpoints.updateParentSettings)
  const dirty = JSON.stringify(draft) !== JSON.stringify(value)

  return (
    <SettingsSection id="parents" title="Parents & collection" description="SchoolShop sends these SMSes for you. Parents never see staff phone numbers.">
      <div className="flex flex-col gap-2 sm:max-w-sm">
        <label htmlFor="reminder" className="text-sm font-semibold">Remind parents who haven't paid</label>
        <NativeSelect id="reminder" value={draft.reminderDays} onChange={(e) => setDraft({ ...draft, reminderDays: Number(e.target.value) })}>
          {reminderOptions.map((o) => <option key={o.days} value={o.days}>{o.label}</option>)}
        </NativeSelect>
        <span className="text-sm text-muted-foreground">One automatic SMS. You can also remind parents yourself from Parent orders.</span>
      </div>
      <label htmlFor="at-school" className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4">
        <span className="flex flex-col">
          <span className="font-medium">SMS parents when their child's pack is at school</span>
          <span className="text-sm text-muted-foreground">Includes the 4-digit collection code again.</span>
        </span>
        <Switch id="at-school" checked={draft.smsWhenAtSchool} onCheckedChange={(on) => setDraft({ ...draft, smsWhenAtSchool: on })} />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">Where packs are collected</legend>
        <RadioGroup value={draft.collectionPoint} onValueChange={(v) => setDraft({ ...draft, collectionPoint: v as SchoolSettings["parents"]["collectionPoint"] })} className="grid gap-2 sm:grid-cols-2">
          {([
            ["class_teacher", "From the class teacher", "Teachers hand out packs in class with the code."],
            ["school_office", "At the school office", "Parents come to the office with the code."],
          ] as const).map(([id, label, hint]) => (
            <label key={id} htmlFor={`cp-${id}`} className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-teal-light/40">
              <RadioGroupItem id={`cp-${id}`} value={id} className="mt-0.5" />
              <span className="flex flex-col">
                <span className="font-medium">{label}</span>
                <span className="text-sm text-muted-foreground">{hint}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </fieldset>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="size-4 shrink-0" aria-hidden /> A collection code is always needed to hand over a pack.
      </p>
      {save.error && <p role="alert" className="text-sm font-medium text-destructive">{errorText(save.error)}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!dirty || save.isPending} onClick={() => save.mutate(draft)}>{save.isPending ? "Saving…" : "Save"}</Button>
        {dirty && <Button variant="ghost" onClick={() => setDraft(value)}>Undo changes</Button>}
        <Saved show={save.isSuccess && !dirty} />
      </div>
    </SettingsSection>
  )
}

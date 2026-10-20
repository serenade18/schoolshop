import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { BadgeCheck, Lock, Mail, Smartphone, Trash2, UserPlus } from "lucide-react"
import { z } from "zod"

import { PageHeader } from "@/components/common/PageHeader"
import { QueryBoundary } from "@/components/common/QueryBoundary"
import { ChangePasswordSection, Saved, SectionChips, SettingsSection } from "@/components/settings/SettingsSection"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { NativeSelect } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ApiError } from "@/lib/api/client"
import * as endpoints from "@/lib/api/endpoints"
import { useSchoolSettings, useSchoolSettingsMutation } from "@/lib/api/queries"
import type { SchoolSettings, SchoolStaff, SchoolStaffRole } from "@/lib/api/schemas"
import { formatDayLong, normaliseIdentifier, normaliseKenyanPhone } from "@/lib/format"
import { counties, errorText, showContact } from "@/lib/settings"

const roles: Record<SchoolStaffRole, { label: string; can: string }> = {
  school_admin: { label: "Admin", can: "Everything, including booklists, staff and settings" },
  bursar: { label: "Bursar", can: "Parent orders, payments and refunds" },
  teacher: { label: "Teacher", can: "Hands out packs for their own classes" },
}

const sections = [
  { id: "school", label: "School" },
  { id: "parents", label: "Parents & collection" },
  { id: "staff", label: "Staff" },
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
            <StaffSection team={data.team} classNames={data.classNames} />
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

/* ── Staff ───────────────────────────────────────────────────── */

function StaffSection({ team, classNames }: { team: SchoolStaff[]; classNames: string[] }) {
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const update = useSchoolSettingsMutation(({ id, ...input }: { id: string; role?: SchoolStaffRole; classNames?: string[] }) => endpoints.updateSchoolStaff(id, input))
  const remove = useSchoolSettingsMutation(endpoints.removeSchoolStaff)

  return (
    <SettingsSection
      id="staff"
      title="Staff"
      description="Everyone at the school who uses SchoolShop."
      action={!inviting && <Button variant="outline" onClick={() => setInviting(true)}><UserPlus aria-hidden /> Invite</Button>}
    >
      {inviting && <InviteForm classNames={classNames} onDone={() => setInviting(false)} />}
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      <ul className="flex flex-col divide-y rounded-xl border">
        {team.map((m) => (
          <li key={m.id} className="flex flex-col gap-3 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="flex min-w-0 grow items-center gap-3">
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-light font-display font-semibold text-teal">
                  {m.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="flex flex-wrap items-center gap-2 font-semibold">
                    {m.name}
                    {m.isYou && <Badge variant="secondary">You</Badge>}
                    {m.status === "invited" && <Badge variant="warning">Invite sent</Badge>}
                  </span>
                  <span className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                    {m.contact.includes("@") ? <Mail className="size-3.5 shrink-0" aria-hidden /> : <Smartphone className="size-3.5 shrink-0" aria-hidden />}
                    {showContact(m.contact)}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-2 sm:shrink-0">
                <span className="grow sm:w-36 sm:grow-0">
                  <NativeSelect
                    aria-label={`Role for ${m.name}`}
                    value={m.role}
                    disabled={m.isYou || update.isPending}
                    onChange={(e) => {
                      setError(null)
                      const role = e.target.value as SchoolStaffRole
                      update.mutate({ id: m.id, role }, { onSuccess: () => role === "teacher" && setEditing(m.id), onError: (err) => setError(errorText(err, "role")) })
                    }}
                    className="h-11"
                  >
                    {(Object.keys(roles) as SchoolStaffRole[]).map((r) => <option key={r} value={r}>{roles[r].label}</option>)}
                  </NativeSelect>
                </span>
                {!m.isYou && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${m.name}`}
                    disabled={remove.isPending}
                    onClick={() => {
                      if (!window.confirm(`Remove ${m.name}? They lose access straight away.`)) return
                      setError(null)
                      remove.mutate(m.id, { onError: (err) => setError(errorText(err)) })
                    }}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                )}
              </span>
            </div>
            {m.role === "teacher" && (
              editing === m.id ? (
                <ClassPicker
                  idPrefix={`cls-${m.id}`}
                  all={classNames}
                  initial={m.classNames}
                  label={`Classes for ${m.name}`}
                  saving={update.isPending}
                  onCancel={() => setEditing(null)}
                  onSave={(picked) => update.mutate({ id: m.id, classNames: picked }, { onSuccess: () => setEditing(null), onError: (err) => setError(errorText(err, "classNames")) })}
                />
              ) : (
                <div className="flex flex-wrap items-center gap-2 pl-13 text-sm">
                  <span className="text-muted-foreground">Hands out packs for</span>
                  {m.classNames.length ? m.classNames.map((c) => <Badge key={c} variant="secondary">{c}</Badge>) : <span className="font-semibold text-warn-fg">no classes yet</span>}
                  <Button variant="link" className="h-auto px-1" onClick={() => setEditing(m.id)}>Change classes</Button>
                </div>
              )
            )}
          </li>
        ))}
      </ul>
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        {(Object.keys(roles) as SchoolStaffRole[]).map((r) => (
          <div key={r} className="flex flex-col gap-0.5 rounded-xl bg-paper p-3">
            <dt className="font-semibold">{roles[r].label}</dt>
            <dd className="text-muted-foreground">{roles[r].can}</dd>
          </div>
        ))}
      </dl>
    </SettingsSection>
  )
}

function ClassPicker({ idPrefix, all, initial, label, saving, onSave, onCancel }: { idPrefix: string; all: string[]; initial: string[]; label: string; saving?: boolean; onSave: (picked: string[]) => void; onCancel?: () => void }) {
  const [picked, setPicked] = useState(initial)
  return (
    <fieldset className="flex flex-col gap-3 rounded-xl bg-paper p-3.5">
      <legend className="sr-only">{label}</legend>
      <ClassBoxes idPrefix={idPrefix} all={all} picked={picked} onChange={setPicked} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onSave(picked)} disabled={saving || picked.length === 0}>Save classes</Button>
        {onCancel && <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </fieldset>
  )
}

function ClassBoxes({ idPrefix, all, picked, onChange }: { idPrefix: string; all: string[]; picked: string[]; onChange: (p: string[]) => void }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-x-3 gap-y-1">
      {all.map((c) => {
        const id = `${idPrefix}-${c.replace(/\s+/g, "-")}`
        return (
          <label key={c} htmlFor={id} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-medium">
            <Checkbox id={id} checked={picked.includes(c)} onCheckedChange={(on) => onChange(on ? [...picked, c] : picked.filter((x) => x !== c))} />
            {c}
          </label>
        )
      })}
    </div>
  )
}

const inviteSchema = z.object({
  name: z.string().trim().min(2, "Enter their name"),
  contact: z.string().trim().refine((v) => normaliseIdentifier(v) !== null, "Enter a Kenyan mobile number or an email"),
  role: z.enum(["school_admin", "bursar", "teacher"]),
})
type InviteValues = z.infer<typeof inviteSchema>

function InviteForm({ classNames, onDone }: { classNames: string[]; onDone: () => void }) {
  const form = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { name: "", contact: "", role: "teacher" } })
  const [picked, setPicked] = useState<string[]>([])
  const [classError, setClassError] = useState<string | null>(null)
  const invite = useSchoolSettingsMutation(endpoints.inviteSchoolStaff)
  const [contact, role] = useWatch({ control: form.control, name: ["contact", "role"] })
  return (
    <Form {...form}>
      <form
        noValidate
        className="flex flex-col gap-4 rounded-xl border-2 border-primary/30 bg-teal-light/40 p-4"
        onSubmit={form.handleSubmit((v) => {
          if (v.role === "teacher" && picked.length === 0) return setClassError("Choose at least one class for this teacher.")
          setClassError(null)
          invite.mutate(
            { ...v, contact: normaliseIdentifier(v.contact)!, classNames: v.role === "teacher" ? picked : [] },
            {
              onSuccess: onDone,
              onError: (e) => form.setError(e instanceof ApiError && e.fieldErrors.contact ? "contact" : "root", { message: errorText(e, "contact") }),
            }
          )
        })}
      >
        <h3 className="font-semibold">Invite someone</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="contact" render={({ field }) => (
            <FormItem><FormLabel>Phone or email</FormLabel><FormControl><Input placeholder="0711 222 333" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="role" render={({ field }) => (
            <FormItem><FormLabel>Role</FormLabel><FormControl>
              <NativeSelect {...field}>{(Object.keys(roles) as SchoolStaffRole[]).map((r) => <option key={r} value={r}>{roles[r].label}</option>)}</NativeSelect>
            </FormControl><FormMessage /></FormItem>
          )} />
        </div>
        {role === "teacher" && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">Their classes</legend>
            <ClassBoxes idPrefix="invite-cls" all={classNames} picked={picked} onChange={setPicked} />
            {classError && <p role="alert" className="text-sm font-medium text-destructive">{classError}</p>}
          </fieldset>
        )}
        <p className="text-sm text-muted-foreground">
          We'll send them {contact.includes("@") ? "an email" : "an SMS"} with a link to set up their account.
        </p>
        {form.formState.errors.root && <p role="alert" className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={invite.isPending}>{invite.isPending ? "Sending…" : "Send invite"}</Button>
          <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        </div>
      </form>
    </Form>
  )
}

import { Fragment, useState, type ReactNode } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog } from "radix-ui"
import { Check, Mail, Minus, PauseCircle, PlayCircle, RotateCw, Smartphone, Trash2, UserPlus, X } from "lucide-react"
import { z } from "zod"

import { PageHeader } from "@/components/common/PageHeader"
import { QueryBoundary } from "@/components/common/QueryBoundary"
import { StatCard } from "@/components/common/StatCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { permissionCatalog, roleCatalog, type OrgType, type RoleDef } from "@/lib/access"
import { ApiError } from "@/lib/api/client"
import * as endpoints from "@/lib/api/endpoints"
import { useStaff, useStaffMutation } from "@/lib/api/queries"
import type { StaffDirectory, StaffMember } from "@/lib/api/schemas"
import { normaliseIdentifier } from "@/lib/format"
import { errorText, showContact } from "@/lib/settings"
import { cn } from "@/lib/utils"

/*
 * Staff and roles for one organisation: who's in, what role they hold, and
 * what each role can do. Used by schools, publishers and SchoolShop admins.
 */

type Props = { scope: endpoints.StaffScope; orgType: OrgType; title: string; eyebrow: string }

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
function ago(iso: string) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000)
  if (mins < 2) return "just now"
  if (mins < 60) return relative.format(-mins, "minute")
  const hours = Math.round(mins / 60)
  return hours < 24 ? relative.format(-hours, "hour") : relative.format(-Math.round(hours / 24), "day")
}

export function StaffManager({ scope, orgType, title, eyebrow }: Props) {
  const staff = useStaff(scope)
  const [inviting, setInviting] = useState(false)
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} actions={<Button onClick={() => setInviting(true)}><UserPlus aria-hidden /> Invite</Button>} />
      <QueryBoundary query={staff}>
        {(d) => (
          <>
            <Directory scope={scope} orgType={orgType} data={d} />
            <InviteSheet open={inviting} onClose={() => setInviting(false)} scope={scope} orgType={orgType} classNames={d.classNames} />
          </>
        )}
      </QueryBoundary>
    </>
  )
}

function Directory({ scope, orgType, data }: { scope: endpoints.StaffScope; orgType: OrgType; data: StaffDirectory }) {
  const roles = roleCatalog[orgType]
  const [error, setError] = useState<string | null>(null)
  const [classesFor, setClassesFor] = useState<StaffMember | null>(null)
  const update = useStaffMutation(scope, ({ id, ...input }: { id: string } & endpoints.StaffChange) => endpoints.updateStaff(scope, id, input))
  const remove = useStaffMutation(scope, (id: string) => endpoints.removeStaff(scope, id))
  const resend = useStaffMutation(scope, (id: string) => endpoints.resendStaffInvite(scope, id))
  const run = <V,>(m: { mutate: (v: V, o: { onError: (e: Error) => void; onSuccess: () => void }) => void }, v: V) => {
    setError(null)
    m.mutate(v, { onError: (e) => setError(errorText(e, "role")), onSuccess: () => undefined })
  }

  const count = (status: StaffMember["status"]) => data.members.filter((m) => m.status === status).length
  const roleOf = (m: StaffMember) => roles.find((r) => r.id === m.role)

  const actions = (m: StaffMember) =>
    m.isYou ? null : (
      <span className="flex items-center justify-end gap-1">
        {m.status === "invited" && (
          <Button size="sm" variant="ghost" onClick={() => run(resend, m.id)} aria-label={`Resend invite to ${m.name}`}><RotateCw aria-hidden /> Resend</Button>
        )}
        {m.status === "active" && (
          <Button size="icon" variant="ghost" onClick={() => window.confirm(`Pause ${m.name}'s access? They're signed out straight away.`) && run(update, { id: m.id, status: "suspended" })} aria-label={`Pause ${m.name}'s access`}>
            <PauseCircle aria-hidden />
          </Button>
        )}
        {m.status === "suspended" && (
          <Button size="sm" variant="ghost" onClick={() => run(update, { id: m.id, status: "active" })} aria-label={`Turn ${m.name}'s access back on`}><PlayCircle aria-hidden /> Turn on</Button>
        )}
        <Button size="icon" variant="ghost" onClick={() => window.confirm(`Remove ${m.name}? They lose access straight away.`) && run(remove, m.id)} aria-label={`Remove ${m.name}`}>
          <Trash2 aria-hidden />
        </Button>
      </span>
    )

  const roleSelect = (m: StaffMember) => (
    <NativeSelect
      aria-label={`Role for ${m.name}`}
      value={m.role}
      disabled={m.isYou || update.isPending}
      onChange={(e) => {
        const role = roles.find((r) => r.id === e.target.value)
        if (role?.scopedToClasses && data.classNames.length) {
          setClassesFor({ ...m, role: role.id })
          return
        }
        run(update, { id: m.id, role: e.target.value })
      }}
      className="h-11"
    >
      {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
    </NativeSelect>
  )

  const access = (m: StaffMember) =>
    roleOf(m)?.scopedToClasses ? (
      <span className="flex flex-wrap items-center gap-1.5">
        {m.classNames.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
        <Button variant="link" className="h-auto px-1 text-sm" onClick={() => setClassesFor(m)}>Change</Button>
      </span>
    ) : (
      <span className="text-sm text-muted-foreground">{roleOf(m)?.permissions.length === permissionCatalog[orgType].length ? "Everything" : `${roleOf(m)?.permissions.length ?? 0} of ${permissionCatalog[orgType].length} permissions`}</span>
    )

  return (
    <>
      <section aria-label="Key numbers" className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <StatCard label="Active" value={count("active")} hint="Can sign in now" />
        <StatCard label="Invites pending" value={count("invited")} hint="Waiting for them to accept" />
        <StatCard label="Paused" value={count("suspended")} hint="Signed out until turned back on" />
        <StatCard label="Roles" value={roles.length} hint={roles.map((r) => r.label).join(", ")} />
      </section>

      {error && <p role="alert" className="rounded-2xl bg-warn-bg p-4 text-[15px] text-warn-fg">{error}</p>}

      <section aria-labelledby="members-h" className="flex flex-col gap-3">
        <h2 id="members-h" className="font-display text-xl font-semibold">People</h2>
        <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-44">Role</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.members.map((m) => (
                <TableRow key={m.id} className={cn(m.status === "suspended" && "opacity-70")}>
                  <TableCell><Person m={m} /></TableCell>
                  <TableCell>{roleSelect(m)}</TableCell>
                  <TableCell>{access(m)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.lastActiveAt ? ago(m.lastActiveAt) : "—"}</TableCell>
                  <TableCell>{actions(m)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ul className="flex flex-col gap-2.5 md:hidden">
          {data.members.map((m) => (
            <li key={m.id} className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4", m.status === "suspended" && "opacity-70")}>
              <div className="flex items-start justify-between gap-2"><Person m={m} />{actions(m)}</div>
              {roleSelect(m)}
              {access(m)}
            </li>
          ))}
        </ul>
      </section>

      <RoleMatrix orgType={orgType} />

      <section aria-labelledby="activity-h" className="flex flex-col gap-3">
        <h2 id="activity-h" className="font-display text-xl font-semibold">Recent changes</h2>
        <ul className="flex flex-col divide-y rounded-2xl border bg-card">
          {data.activity.map((a) => (
            <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-3 text-[15px]">
              <span><span className="font-semibold">{a.actor}</span> {a.text}</span>
              <span className="text-[13px] text-muted-foreground">{ago(a.at)}</span>
            </li>
          ))}
        </ul>
      </section>

      <ClassesDialog
        member={classesFor}
        all={data.classNames}
        saving={update.isPending}
        onClose={() => setClassesFor(null)}
        onSave={(m, picked) =>
          update.mutate(
            { id: m.id, role: m.role, classNames: picked },
            { onSuccess: () => setClassesFor(null), onError: (e) => setError(errorText(e, "classNames")) }
          )
        }
      />
    </>
  )
}

function Person({ m }: { m: StaffMember }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-light font-display font-semibold text-teal">
        {m.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="flex flex-wrap items-center gap-1.5 font-semibold">
          {m.name}
          {m.isYou && <Badge variant="secondary">You</Badge>}
          {m.status === "invited" && <Badge variant="warning">Invite sent</Badge>}
          {m.status === "suspended" && <Badge variant="destructive">Paused</Badge>}
        </span>
        <span className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
          {m.contact.includes("@") ? <Mail className="size-3.5 shrink-0" aria-hidden /> : <Smartphone className="size-3.5 shrink-0" aria-hidden />}
          {showContact(m.contact)}
        </span>
      </span>
    </span>
  )
}

function RoleMatrix({ orgType }: { orgType: OrgType }) {
  const roles = roleCatalog[orgType]
  const perms = permissionCatalog[orgType]
  const groups = [...new Set(perms.map((p) => p.group))]
  return (
    <section aria-labelledby="roles-h" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="roles-h" className="font-display text-xl font-semibold">What each role can do</h2>
        <p className="text-sm text-muted-foreground">Roles are set by SchoolShop so access stays predictable. Give someone the smallest role that covers their work.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {roles.map((r) => <RoleCard key={r.id} role={r} orgType={orgType} />)}
      </div>
      <div className="hidden overflow-hidden rounded-2xl border bg-card lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Permission</TableHead>
              {roles.map((r) => <TableHead key={r.id} scope="col" className="text-center">{r.label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <Fragment key={g}>
                <TableRow className="bg-paper hover:bg-paper">
                  <TableCell colSpan={roles.length + 1} className="py-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">{g}</TableCell>
                </TableRow>
                {perms.filter((p) => p.group === g).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.label}</TableCell>
                    {roles.map((r) => (
                      <TableCell key={r.id} className="text-center">
                        {r.permissions.includes(p.id) ? (
                          <Check className="mx-auto size-4.5 text-success-fg" aria-label={`${r.label} can`} />
                        ) : (
                          <Minus className="mx-auto size-4 text-line-strong" aria-label={`${r.label} can't`} />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

function RoleCard({ role, orgType }: { role: RoleDef; orgType: OrgType }) {
  const perms = permissionCatalog[orgType].filter((p) => role.permissions.includes(p.id))
  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
      <span className="font-semibold">{role.label}</span>
      <span className="text-sm text-muted-foreground">{role.description}</span>
      <ul className="flex flex-col gap-1 text-sm">
        {perms.map((p) => <li key={p.id} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success-fg" aria-hidden />{p.label}</li>)}
      </ul>
    </div>
  )
}

function Sheet({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description: string; children: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-y-auto rounded-t-3xl bg-surface outline-none",
            "md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[480px] md:rounded-none md:rounded-l-3xl",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-8 md:data-[state=open]:slide-in-from-right-8"
          )}
        >
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-surface px-6 py-5">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="font-display text-xl font-semibold">{title}</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">{description}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close"><X aria-hidden /></Button>
            </Dialog.Close>
          </div>
          <div className="px-6 py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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

function ClassesDialog({ member, all, saving, onClose, onSave }: { member: StaffMember | null; all: string[]; saving: boolean; onClose: () => void; onSave: (m: StaffMember, picked: string[]) => void }) {
  return (
    <Sheet open={member !== null} onClose={onClose} title={member ? `Classes for ${member.name}` : ""} description="Teachers see and hand out packs for these classes only.">
      {member && <ClassesForm key={member.id + member.role} member={member} all={all} saving={saving} onSave={onSave} />}
    </Sheet>
  )
}

function ClassesForm({ member, all, saving, onSave }: { member: StaffMember; all: string[]; saving: boolean; onSave: (m: StaffMember, picked: string[]) => void }) {
  const [picked, setPicked] = useState(member.classNames)
  return (
    <div className="flex flex-col gap-4">
      <ClassBoxes idPrefix={`cls-${member.id}`} all={all} picked={picked} onChange={setPicked} />
      <Button onClick={() => onSave(member, picked)} disabled={saving || picked.length === 0}>{saving ? "Saving…" : "Save classes"}</Button>
    </div>
  )
}

const inviteSchema = z.object({
  name: z.string().trim().min(2, "Enter their name"),
  contact: z.string().trim().refine((v) => normaliseIdentifier(v) !== null, "Enter a Kenyan mobile number or an email"),
  role: z.string().min(1, "Choose a role"),
})
type InviteValues = z.infer<typeof inviteSchema>

function InviteSheet({ open, onClose, scope, orgType, classNames }: { open: boolean; onClose: () => void; scope: endpoints.StaffScope; orgType: OrgType; classNames: string[] }) {
  return (
    <Sheet open={open} onClose={onClose} title="Invite someone" description="They get a link by SMS or email to set up their own sign-in.">
      {open && <InviteForm scope={scope} orgType={orgType} classNames={classNames} onDone={onClose} />}
    </Sheet>
  )
}

function InviteForm({ scope, orgType, classNames, onDone }: { scope: endpoints.StaffScope; orgType: OrgType; classNames: string[]; onDone: () => void }) {
  const roles = roleCatalog[orgType]
  const lowest = roles[roles.length - 1]
  const form = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { name: "", contact: "", role: lowest.id } })
  const [picked, setPicked] = useState<string[]>([])
  const [classError, setClassError] = useState<string | null>(null)
  const invite = useStaffMutation(scope, (input: { name: string; contact: string; role: string; classNames: string[] }) => endpoints.inviteStaff(scope, input))
  const [contact, roleId] = useWatch({ control: form.control, name: ["contact", "role"] })
  const role = roles.find((r) => r.id === roleId)

  return (
    <Form {...form}>
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={form.handleSubmit((v) => {
          if (role?.scopedToClasses && picked.length === 0) return setClassError("Choose at least one class.")
          setClassError(null)
          invite.mutate(
            { ...v, contact: normaliseIdentifier(v.contact)!, classNames: role?.scopedToClasses ? picked : [] },
            {
              onSuccess: onDone,
              onError: (e) => {
                const f = e instanceof ApiError ? e.fieldErrors : {}
                if (f.classNames) setClassError(f.classNames[0])
                else form.setError(f.contact ? "contact" : f.name ? "name" : "root", { message: errorText(e, f.contact ? "contact" : "name") })
              },
            }
          )
        })}
      >
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Name</FormLabel><FormControl><Input autoComplete="off" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="contact" render={({ field }) => (
          <FormItem><FormLabel>Phone or email</FormLabel><FormControl><Input placeholder="0711 222 333" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="role" render={({ field }) => (
          <FormItem>
            <FormLabel>Role</FormLabel>
            <div role="radiogroup" aria-label="Role" className="flex flex-col gap-2">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={field.value === r.id}
                  onClick={() => field.onChange(r.id)}
                  className={cn("flex flex-col gap-0.5 rounded-xl border p-3.5 text-left", field.value === r.id ? "border-primary bg-teal-light/50 ring-1 ring-primary" : "hover:bg-paper")}
                >
                  <span className="font-semibold">{r.label}</span>
                  <span className="text-sm text-muted-foreground">{r.description}</span>
                </button>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )} />
        {role?.scopedToClasses && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">Their classes</legend>
            <ClassBoxes idPrefix="invite-cls" all={classNames} picked={picked} onChange={setPicked} />
            {classError && <p role="alert" className="text-sm font-medium text-destructive">{classError}</p>}
          </fieldset>
        )}
        <p className="text-sm text-muted-foreground">We'll send them {contact.includes("@") ? "an email" : "an SMS"} with a link to set up their account.</p>
        {form.formState.errors.root && <p role="alert" className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>}
        <Button type="submit" size="lg" disabled={invite.isPending}>{invite.isPending ? "Sending…" : "Send invite"}</Button>
      </form>
    </Form>
  )
}

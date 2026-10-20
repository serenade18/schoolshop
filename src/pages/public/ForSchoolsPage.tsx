import { BellRing, ClipboardList, PackageCheck, QrCode, Truck, Users, Wallet, ListChecks, Share2 } from "lucide-react"

import { GradientBar } from "@/components/common/GradientBar"
import { PartnerLanding, type PartnerLandingContent } from "@/components/marketing/PartnerLanding"

const content: PartnerLandingContent = {
  eyebrow: "For schools",
  title: (
    <>
      Publish your booklists once. <span className="text-accent-text">We handle the rest.</span>
    </>
  ),
  lead:
    "Parents buy the exact list you set, pay with M-Pesa, and the publishers deliver to your school in bulk. No cash at the gate, no chasing receipts, no queues in town.",
  registerTo: "/register?type=school",
  registerLabel: "Register your school",
  tone: "teal",
  preview: <SchoolPreview />,
  benefits: [
    { title: "The exact list", body: "Parents see the items, editions and quantities you chose, priced by the publishers.", icon: ClipboardList },
    { title: "No money handling", body: "Parents pay SchoolShop directly. Your bursar never collects book money.", icon: Wallet },
    { title: "One delivery per publisher", body: "Instead of hundreds of parcels, each publisher brings one labelled delivery.", icon: Truck },
  ],
  steps: [
    { title: "Register", body: "Apply with your MoE registration number. We verify schools, usually within 2 working days." },
    { title: "Publish booklists", body: "Build each grade's list from the catalog, mark items required or optional and set an order deadline." },
    { title: "Share with parents", body: "Send the link or school code by SMS or WhatsApp. Parents link their child and pay." },
    { title: "Receive and hand out", body: "Check deliveries in, then teachers hand each child their labelled pack against a collection code." },
  ],
  features: [
    { title: "Booklist builder", body: "Search the catalog by grade and subject, copy last term's list and publish in minutes.", icon: ListChecks },
    { title: "Live order tracking", body: "See which students have ordered per class, and who still needs a nudge before the deadline.", icon: Users },
    { title: "Deadline reminders", body: "Parents who haven't ordered get an SMS reminder 3 days before your deadline.", icon: BellRing },
    { title: "Easy sharing", body: "One link per grade, plus a school code parents can type in the app.", icon: Share2 },
    { title: "Delivery check-in", body: "Mark each publisher's delivery received and flag anything missing or damaged.", icon: PackageCheck },
    { title: "Collection codes", body: "Each pack is labelled with the child's name. Teachers confirm hand-out with the parent's code.", icon: QrCode },
  ],
  checklistTitle: "What you need to register",
  checklist: [
    "Your school's Ministry of Education registration number",
    "The name, role and phone number of the person managing booklists",
    "A work email for signing in",
    "Your class and grade structure for this term (you can add it after sign-up)",
  ],
  faqs: [
    {
      q: "Do parents have to use SchoolShop?",
      a: "No. Parents who prefer to buy elsewhere still can. SchoolShop gives them a quicker way to get the exact list, delivered to school.",
    },
    {
      q: "What if a book is out of stock?",
      a: "The publisher marks the line unavailable and the parent is refunded for that item. You can see these lines in the order view.",
    },
    {
      q: "Who receives the deliveries?",
      a: "Anyone you add as school staff can check deliveries in from a phone or computer. Packs come labelled by class and child.",
    },
    {
      q: "Can teachers use it too?",
      a: "Yes. Teachers get a simple view of their class: who has ordered, which packs have arrived and who has collected.",
    },
  ],
  closingTitle: "Ready for next term?",
  closingBody: "Register your school and publish your first booklist before the order deadline.",
}

export function ForSchoolsPage() {
  return <PartnerLanding content={content} />
}

/** Decorative glimpse of the school dashboard. */
function SchoolPreview() {
  return (
    <div aria-hidden className="flex flex-col gap-3 rounded-3xl border bg-surface p-5 shadow-[0_24px_48px_-24px_rgb(16_19_19/0.3)]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="font-display text-base font-semibold">Greenhill Academy</span>
          <span className="text-xs text-muted-foreground">Term 1 · order deadline 10 Jan</span>
        </span>
        <span className="rounded-full bg-success-bg px-2.5 py-1 text-[11px] font-bold text-success-fg">Published</span>
      </div>
      {[
        { grade: "Grade 1", done: 58, of: 90 },
        { grade: "Grade 4", done: 63, of: 120 },
        { grade: "Grade 7", done: 150, of: 270 },
      ].map((g) => (
        <div key={g.grade} className="flex flex-col gap-1.5 rounded-2xl bg-paper p-3.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">{g.grade}</span>
            <span className="text-muted-foreground">
              {g.done} of {g.of} ordered
            </span>
          </div>
          <GradientBar value={g.done / g.of} className="h-1.5" />
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-sm">
        <span className="flex items-center gap-2 font-semibold">
          <Truck className="size-4 text-accent-text" /> Longhorn · 312 packs
        </span>
        <span className="rounded-full bg-info-bg px-2.5 py-1 text-[11px] font-bold text-info-fg">Arriving 14 Jan</span>
      </div>
    </div>
  )
}

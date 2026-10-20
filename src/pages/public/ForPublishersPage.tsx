import { BadgeCheck, Banknote, BookOpen, Boxes, FileSpreadsheet, MapPin, Printer, Receipt, School } from "lucide-react"

import { PartnerLanding, type PartnerLandingContent } from "@/components/marketing/PartnerLanding"
import { formatKes } from "@/lib/format"

const content: PartnerLandingContent = {
  eyebrow: "For publishers and suppliers",
  title: (
    <>
      Prepaid school orders, <span className="text-accent-text">one delivery per school.</span>
    </>
  ),
  lead:
    "List your catalog once. When a school's order window closes, you get one confirmed, already-paid order for that school, with pick lists and labels ready to print.",
  registerTo: "/register?type=publisher",
  registerLabel: "Become a supplier",
  tone: "orange",
  preview: <PublisherPreview />,
  benefits: [
    { title: "Paid before you pack", body: "Parents pay up front with M-Pesa or card. You only ship confirmed orders.", icon: Banknote },
    { title: "Grouped per school", body: "Hundreds of parent orders arrive as one batch per school, by class.", icon: School },
    { title: "Reach more schools", body: "Your titles show on every school list that uses them, across the country.", icon: MapPin },
  ],
  steps: [
    { title: "Apply", body: "Register your company with its KRA PIN. We verify suppliers, usually within 2 working days." },
    { title: "List your catalog", body: "Add titles with prices and stock, or upload a spreadsheet. Schools add them to their booklists." },
    { title: "Pack and dispatch", body: "After each school's deadline, print the pick list and labels, pack by class and dispatch." },
    { title: "Get paid", body: "Once the school confirms the delivery, we pay you by M-Pesa or bank transfer, less our commission." },
  ],
  features: [
    { title: "Catalog and stock", body: "Keep prices, editions and stock levels up to date. Out-of-stock titles stop selling automatically.", icon: BookOpen },
    { title: "Bulk upload", body: "Bring your whole price list in from a spreadsheet instead of typing it in.", icon: FileSpreadsheet },
    { title: "School batches", body: "See every school's order: packs, value, due date and status, from collecting to received.", icon: Boxes },
    { title: "Pick lists and labels", body: "Print pick lists per school and labels per child, sorted by class.", icon: Printer },
    { title: "Delivery confirmation", body: "Schools check your delivery in, so there's a clear record of what arrived and when.", icon: BadgeCheck },
    { title: "Payout statements", body: "See each payout with the orders it covers, the commission and the net amount.", icon: Receipt },
  ],
  checklistTitle: "What you need to apply",
  checklist: [
    "Your company's KRA PIN and registration details",
    "A contact for orders, and one for finance",
    "Payout details: M-Pesa till or paybill, or a bank account",
    "Your current price list (a spreadsheet is fine)",
  ],
  faqs: [
    {
      q: "How much does SchoolShop charge?",
      a: "We take a commission on each sale, deducted before payout. The rate is agreed with you when your account is verified.",
    },
    {
      q: "When do I get paid?",
      a: "Payout for a school's batch is released once the school confirms the delivery. You can follow every payout in your dashboard.",
    },
    {
      q: "What if I can't supply a title?",
      a: "Mark the line unavailable in the batch. The parents are refunded for that item and the rest of the order goes ahead.",
    },
    {
      q: "Do I deliver to each parent?",
      a: "No. You deliver once to each school, packed and labelled by class and child. Teachers hand the packs out.",
    },
  ],
  closingTitle: "Get your titles on school lists",
  closingBody: "Apply now and have your catalog ready before schools publish next term's booklists.",
}

export function ForPublishersPage() {
  return <PartnerLanding content={content} />
}

/** Decorative glimpse of the publisher's school batches. */
function PublisherPreview() {
  const batches = [
    { school: "Greenhill Academy", town: "Nakuru", packs: 312, value: 18_720_000, status: "Ready to pack", tone: "bg-warn-bg text-warn-fg" },
    { school: "St. Mary's Primary", town: "Eldoret", packs: 204, value: 11_830_000, status: "Ready to pack", tone: "bg-warn-bg text-warn-fg" },
    { school: "Hillcrest Prep", town: "Nyeri", packs: 140, value: 8_400_000, status: "Dispatched", tone: "bg-info-bg text-info-fg" },
  ]
  return (
    <div aria-hidden className="flex flex-col gap-3 rounded-3xl border bg-surface p-5 shadow-[0_24px_48px_-24px_rgb(16_19_19/0.3)]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="font-display text-base font-semibold">School orders</span>
          <span className="text-xs text-muted-foreground">Term 1 · all prepaid</span>
        </span>
        <span className="font-display text-lg font-semibold">{formatKes(38_950_000)}</span>
      </div>
      {batches.map((b) => (
        <div key={b.school} className="flex items-center justify-between gap-3 rounded-2xl bg-paper p-3.5">
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">{b.school}</span>
            <span className="text-xs text-muted-foreground">
              {b.town} · {b.packs} packs · {formatKes(b.value)}
            </span>
          </span>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${b.tone}`}>{b.status}</span>
        </div>
      ))}
    </div>
  )
}

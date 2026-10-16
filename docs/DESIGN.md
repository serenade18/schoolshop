# SchoolShop — Product & System Design

Status: **Draft v0.1** — for review before we start building.
UI mockups: the SchoolShop Screens canvas (claude.ai artifact) and the Figma file "SchoolShop — App Design" (all 23 screens as editable layers).

---

## 1. What we're building

SchoolShop is a marketplace for school materials (textbooks, stationery, readers) in Kenya.

- **Schools** say what each grade needs (a *booklist*) and set the deadlines.
- **Parents** buy their child's booklist in a few taps and pay with M-Pesa or card.
- **Publishers** list their catalog, receive *one consolidated order per school*, and deliver it to the school.
- Materials are **delivered to the school**, packed and labelled per student. The child collects the pack from the class teacher.

Why delivery to school: one shipment per school per publisher instead of hundreds of home deliveries. It costs less, schools already have a hand-out process, and there are no courier fees for parents.

## 2. Users and roles

| Role | Who | Main jobs |
|---|---|---|
| **Parent** | Buyer. Mobile-first, often on a low-end Android over mobile data. | Add children, view booklist, untick items they already own, pay, track, collect. |
| **School admin** | Bursar / head teacher / office. | Set up grades & classes, build and publish booklists, share the link with parents, track who has ordered, receive deliveries, confirm hand-out. |
| **Class teacher** *(sub-role of school)* | | See their class roster, hand out packs, confirm collection with the parent's code. |
| **Publisher staff** | Sales / warehouse / finance. | Maintain catalog & stock, see school orders, print pick lists & labels, dispatch, confirm delivery, see payouts. |
| **Platform admin** *(us)* | | Verify schools & publishers, handle refunds and disputes, run payouts, set commission. |

One person can belong to several organisations (a parent who is also a teacher). Access is granted through **memberships** (`user` × `organisation` × `role`), not by user type.

## 3. Core concepts

- **Term**: e.g. *Term 1, 2027*. Booklists belong to a school + term.
- **Booklist**: what one grade (or set of classes) needs for a term. Has an **order deadline** and a **deliver-by** date. Items are either *required* or *optional*.
- **Booklist item**: points to a publisher **product** and keeps a **price snapshot** taken when the list is published. Parents see a stable price even if the publisher changes it later.
- **Student**: belongs to a school & class. Parents link to a student with a **school code + admission number**. The school can also bulk-invite parents by phone.
- **Order**: what a parent pays for, for one student and one booklist. One payment, possibly many publishers.
- **Fulfilment line**: an order item assigned to the publisher that supplies it.
- **School batch**: everything one publisher must deliver to one school for one term. Built from all paid orders when the school's order deadline passes. *This is the publisher's unit of work.*
- **Collection**: the hand-over of a student's pack at school, confirmed with a 4-digit code.

## 4. End-to-end flow

```
SCHOOL                     PARENT                       PUBLISHER                  PLATFORM
──────                     ──────                       ─────────                  ────────
Build booklist from
publisher catalogs
Publish (prices locked) ─► SMS/link: "Grade 4 list
                           is ready"
                           Review list, untick owned
                           items → pay (M-Pesa STK) ──────────────────────────────► Payment confirmed,
                                                                                    funds held
                           Order = PAID
Order deadline passes ───────────────────────────────────────────────────────────► Build school batches
                                                        Batch = READY_TO_PACK  ◄── (one per publisher
                                                        Pick list + per-student     per school)
                                                        labels
                                                        Dispatch ──► Batch = DISPATCHED
Receive delivery,
check against packing list
Mark RECEIVED ───────────────────────────────────────────────────────────────────► Release publisher
                                                                                    payout (minus fee)
Hand out packs; teacher
enters parent's code ────► Order = COLLECTED
```

### 4.1 Late orders
After the deadline, the school can open a **top-up window**. Late orders go into a second, smaller batch per publisher. The school decides whether to allow this.

### 4.2 Out of stock / short delivery
- The publisher marks lines *unavailable* before dispatch → those lines are **auto-refunded** to the parent (M-Pesa reversal / card refund) and the parent gets an SMS.
- If the school marks a delivery short on receipt → a dispute opens and the affected lines are refunded or re-shipped.

### 4.3 Cancellations
Parents can cancel up to the order deadline for a full refund. After the batch is built, cancellations go through support.

## 5. Order & batch states

**Order (parent):**
`PENDING_PAYMENT → PAID → IN_FULFILMENT → AT_SCHOOL → COLLECTED`
Side states: `PAYMENT_FAILED`, `CANCELLED`, `PARTIALLY_REFUNDED`, `REFUNDED`.

**School batch (publisher × school × term):**
`COLLECTING → READY_TO_PACK → DISPATCHED → RECEIVED → SETTLED`
Side state: `DISPUTED`.

An order moves to `AT_SCHOOL` when every batch holding its lines is `RECEIVED`.

## 6. Data model (first cut)

```
User(id, name, phone, email?, password_hash?, created_at)
Organisation(id, type: SCHOOL|PUBLISHER|PLATFORM, name, county, town, verified_at, payout_details)
Membership(user_id, org_id, role: ADMIN|STAFF|TEACHER|FINANCE)

School ⟶ Organisation(type=SCHOOL)
  Grade(id, school_id, name)                     e.g. "Grade 4"
  Class(id, grade_id, name, teacher_user_id?)    e.g. "4 East"
  Student(id, school_id, class_id, admission_no, name)
  Guardian(user_id, student_id, relationship)    parent ↔ child link

Publisher ⟶ Organisation(type=PUBLISHER)
  Product(id, publisher_id, title, isbn?, subject, grade_band, price_kes,
          stock_qty, cover_url?, status: DRAFT|LIVE|ARCHIVED)

Term(id, school_id, name, starts_on)
Booklist(id, school_id, term_id, grade_id, class_ids[], order_deadline, deliver_by,
         status: DRAFT|PUBLISHED|CLOSED)
BooklistItem(id, booklist_id, product_id, required, qty_per_student, unit_price_kes /*snapshot*/)

Order(id, parent_user_id, student_id, booklist_id, status, subtotal_kes, fee_kes,
      total_kes, collection_code, created_at)
OrderItem(id, order_id, booklist_item_id, product_id, publisher_id, qty, unit_price_kes,
          status: ACTIVE|UNAVAILABLE|REFUNDED, school_batch_id?)
Payment(id, order_id, method: MPESA|CARD, provider_ref, phone?, amount_kes,
        status: INITIATED|SUCCEEDED|FAILED|REVERSED, raw_callback jsonb)
Refund(id, payment_id, order_item_ids[], amount_kes, status, provider_ref)

SchoolBatch(id, school_id, publisher_id, term_id, kind: MAIN|TOP_UP, status,
            dispatched_at, received_at, received_by_user_id, notes)
Collection(order_id, collected_at, confirmed_by_user_id)

LedgerEntry(id, account, amount_kes, ref_type, ref_id, created_at)   double-entry
Payout(id, publisher_id, school_batch_id, gross_kes, commission_kes, net_kes,
       status, provider_ref)
Notification(id, user_id, channel: SMS|EMAIL|PUSH, template, payload, sent_at)
AuditLog(id, actor_user_id, action, entity, entity_id, diff jsonb, created_at)
```

Money is stored as **integer KES cents**, never floats.

## 7. Money flow

1. The parent pays **SchoolShop** (merchant of record) through an M-Pesa Paybill / STK Push or a card gateway.
2. Funds sit in a held balance (tracked in the ledger) until the school confirms the delivery.
3. On `RECEIVED`, we pay the publisher: `net = gross − commission` (M-Pesa B2B or bank transfer; manual from the admin panel at first).
4. Refunds come out of the held balance before payout.

A double-entry ledger from day one makes reconciliation with M-Pesa statements and payouts auditable.

## 8. Notifications

SMS is the primary channel for parents. Templates:
- List published ("Amani's Grade 4 list is ready: KES 3,750. Order by 10 Jan: <link>")
- Payment received + order number
- Deadline reminder (3 days before) for linked parents who haven't ordered
- Item unavailable → refund issued
- Pack arrived at school + collection code
- Collected (receipt)

Schools and publishers get email digests plus in-app alerts.

## 9. UI & brand

Built from the SchoolShop logo (`docs/brand/`).

| Token | Value | Use |
|---|---|---|
| `ink` | `#141414` | Text, primary buttons, nav |
| `paper` | `#F7F5F2` | App background |
| `surface` | `#FFFFFF` | Cards, tables |
| `line` | `#E7E3DD` | Borders and dividers |
| `muted` | `#5A5650` | Secondary text (passes 4.5:1 on white) |
| `sun` | `#FAAC1C` | Brand gradient start, highlights on dark |
| `flame` | `#ED4E23` | Brand gradient end, "current" state |
| `accent-text` | `#B23A0E` | Orange text and links on light backgrounds |
| `info` | `#E3ECFB` / `#163F8C` | "Done / dispatched" pills |
| `warn` | `#FFF1DE` / `#8A2C0A` | "Needs action" pills |

- Type: **Outfit** for headings (geometric, like the wordmark), **Figtree** for body.
- The yellow→red gradient is used only in thin accents (progress bars), never as a background wash.
- Parents: mobile-first, 44px+ touch targets, light pages (low data). Schools and publishers: responsive web dashboards with a side menu that stacks on phones.

Screens in the canvas: Parent home · Booklist · M-Pesa checkout · Order tracking · School overview · Booklist builder · Publisher school orders · Publisher catalog.

## 10. Technical architecture

**Stack: a React single-page app (Vite) talking to a Django REST Framework API on PostgreSQL.** One SPA serves the public shop, the parent app and the three dashboards; one Django project serves the API, the admin tools and the background jobs.

### Frontend (`frontend/`) — built first

| Concern | Choice |
|---|---|
| App & build | **React + Vite** |
| Language | **TypeScript** (strict) |
| Routing between dashboards | **React Router**: route groups per role, guarded by `RequireRole`, lazy-loaded per role |
| Client state | **Zustand**: auth session, in-progress cart (persisted to localStorage) |
| API calls | **Axios**: one client with the auth header and DRF error normalisation |
| Server state | **TanStack Query**: caching, refetching, payment-status polling |
| Runtime validation | **Zod**: every API response is parsed at the boundary; form schemas |
| Forms | **React Hook Form** + Zod resolver |
| UI | **shadcn/ui + Tailwind CSS** (v4), themed with the brand tokens in §9 |

Until the backend exists, `VITE_USE_MOCKS=true` swaps Axios's adapter for an in-browser mock that follows the same URLs, status codes and error shapes as the planned API.

### Backend (`backend/`) — next

| Layer | Choice | Why |
|---|---|---|
| API | **Django + Django REST Framework** | Batteries-included admin, ORM, auth, permissions. |
| JSON style | `djangorestframework-camel-case` | The API speaks camelCase, so the TypeScript types map 1:1. |
| Database | **PostgreSQL** | Relational data (orders, ledger), transactions, jsonb for provider callbacks. |
| Auth | Phone + SMS OTP for parents; email + password for staff; **JWT** via `djangorestframework-simplejwt` | Parents in Kenya identify by phone number, which is also their M-Pesa number. |
| Background jobs | **Celery + Redis** (`celery beat` for schedules) | Deadline batching, SMS, payment reconciliation, payouts. |
| M-Pesa | **Safaricom Daraja**: STK Push (C2B) to collect, Transaction Status for checks, B2C for refunds, B2B for payouts | Most parents pay this way. |
| Cards | **Paystack** or **Flutterwave** (both support KES) | Backup payment method; choose based on fees and settlement terms. |
| SMS | **Africa's Talking** | Local delivery rates, sender ID. |
| Email | Resend or Postmark | Transactional email for staff. |
| Files | S3-compatible storage (Cloudflare R2) via `django-storages` | Book covers, CSV imports, delivery notes. |
| Hosting | Docker containers (API, worker, beat) on Railway / Render / Fly; managed Postgres + Redis; SPA on a CDN | Simple deploys; Daraja callbacks need a stable public HTTPS URL. |
| Observability | Sentry (frontend + backend), structured logs, uptime check on the payment callback URL | Payment callbacks must never be missed silently. |

### 10.1 Repository layout

```
frontend/                     React + Vite SPA
  src/app/router.tsx          all routes, per-role guards and lazy loading
  src/lib/api/                schemas.ts (Zod), client.ts (Axios), endpoints.ts, queries.ts (TanStack)
  src/stores/                 auth.ts, cart.ts (Zustand)
  src/components/ui/          shadcn/ui primitives
  src/pages/                  public/, auth/, parent/, school/, publisher/, admin/
  src/mocks/                  fixture data + mock Axios adapter
backend/                      Django project (next step)
  accounts/                   users, memberships, phone OTP
  schools/                    schools, grades, classes, students, guardians
  catalog/                    publishers, products
  booklists/                  terms, booklists, items (price snapshots)
  orders/                     orders, items, collections
  payments/                   M-Pesa + card adapters, callbacks, refunds
  fulfilment/                 school batches, dispatch, receipt
  ledger/                     double-entry ledger, payouts
docs/
```

### API contract (first cut)

| Method & path | Used by |
|---|---|
| `POST /api/auth/otp/request/` · `POST /api/auth/otp/verify/` · `GET /api/me/` | sign-in |
| `GET /api/schools/?search=` · `GET /api/schools/{slug}/` · `GET /api/schools/{slug}/booklists/` | public site |
| `GET /api/products/?gradeBand=` · `GET /api/products/{id}/` | shop |
| `GET /api/children/` · `GET /api/booklists/{id}/` | parent |
| `POST /api/orders/` · `GET /api/orders/` · `GET /api/orders/{id}/` | parent checkout & tracking |
| `POST /api/orders/{id}/payments/` · `GET /api/payments/{id}/` | M-Pesa STK push + status polling |
| `POST /api/payments/mpesa/callback/` | Daraja (server-to-server) |
| `GET /api/school/overview/` · `GET /api/school/booklists/` | school dashboard |
| `GET /api/publisher/batches/` | publisher dashboard |
| `GET /api/admin/overview/` | platform admin |

The Zod schemas in `frontend/src/lib/api/schemas.ts` are the source of truth for these response shapes until the DRF serializers exist.

### 10.2 Things that must be correct

- **Payment callbacks are idempotent.** Key them on the provider's reference. Never mark an order paid from the browser, only from a verified callback or a status query.
- **Reconciliation job**: every few minutes, query Daraja for STK requests still `INITIATED` after 2 minutes.
- **Batch building runs in a transaction** at the deadline and can safely run again.
- **Price snapshots** on booklist items and order items.
- **Every mutation by school, publisher or admin staff goes to the audit log.**
- **Data protection**: we hold children's names and parents' phone numbers. Comply with the Kenya Data Protection Act (register as a data controller, collect minimum data, encrypt at rest, restrict access by role).

## 11. MVP scope

**Phase 1 — Pilot with 1–3 schools and 2–3 publishers**
- Publisher: catalog (manual + CSV), view school batches, pick list / labels PDF, mark dispatched.
- School: grades/classes, booklist builder, publish, share link, orders by class, mark delivery received, collection by code.
- Parent: OTP login, link child by school code + admission no., booklist with untick, M-Pesa STK checkout, order tracking, SMS updates.
- Admin: verify orgs, manual refunds, manual payouts, ledger view.

**Phase 2**
- Card payments, automated B2C refunds and B2B payouts, top-up windows, bulk parent invites, deadline reminders.

**Phase 3**
- Uniforms and other non-publisher suppliers, installment payments ("Lipa pole pole"), home delivery option, analytics for publishers.

## 12. Open decisions (need your input)

1. **Revenue model**: commission on publisher sales (e.g. X%), a parent service fee, or both? Does the school get a share or rebate?
2. **Who sets the price?** We assume the publisher sets it and the school can't mark it up.
3. **Merchant of record**: SchoolShop collects all funds and pays out (assumed). Needs a Paybill, a business bank account and possibly a payments licence or partner.
4. **Non-publisher items** (exercise books, geometry sets): suppliers onboarded as "publishers", or a separate "supplier" role?
5. **Tax**: VAT treatment of books vs. stationery, and who invoices the parent.
6. **Student data**: does the school upload a roster (more accurate), or do parents self-register children and the school approves them?
7. **Pilot**: which schools and publishers, and which term?

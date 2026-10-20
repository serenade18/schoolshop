import type {
  AdminOverview,
  Booklist,
  CatalogItem,
  Child,
  Order,
  Product,
  PublisherPayouts,
  PublisherSettings,
  ProductDetail,
  School,
  SchoolBatch,
  SchoolOrderDetail,
  SchoolOverview,
  StudentOrderRow,
  User,
} from "@/lib/api/schemas"

/*
 * Sample data for building the UI before the DRF backend exists. Names and
 * figures are illustrative only. Money is in cents (KES 650 → 65000).
 */

const k = (shillings: number) => shillings * 100

export const schools: School[] = [
  { id: "sch-greenhill", slug: "greenhill-academy", name: "Greenhill Academy", town: "Nakuru", county: "Nakuru", verified: true },
  { id: "sch-stmarys", slug: "st-marys-primary", name: "St. Mary's Primary", town: "Eldoret", county: "Uasin Gishu", verified: true },
  { id: "sch-kilimani", slug: "kilimani-primary", name: "Kilimani Primary", town: "Nairobi", county: "Nairobi", verified: true },
  { id: "sch-riverside", slug: "riverside-junior", name: "Riverside Junior School", town: "Kisumu", county: "Kisumu", verified: true },
]

const item = (
  id: string,
  title: string,
  publisherName: string,
  subject: string,
  price: number,
  required = true,
  qtyPerStudent = 1
) => ({ id, productId: `prd-${id}`, title, publisherName, subject, unitPriceCents: k(price), qtyPerStudent, required })

const greenhillBase = {
  schoolId: "sch-greenhill",
  schoolName: "Greenhill Academy",
  termName: "Term 1, 2027",
  orderDeadline: "2027-01-10",
  deliverBy: "2027-01-20",
  status: "published" as const,
}

export const booklists: Booklist[] = [
  {
    ...greenhillBase,
    id: "bl-g4",
    gradeName: "Grade 4",
    classNames: ["4 East", "4 West", "4 North"],
    items: [
      item("g4-math", "Mathematics Activities Grade 4", "Longhorn", "Mathematics", 650),
      item("g4-eng", "English Activities Grade 4", "KLB", "English", 620),
      item("g4-kis", "Kiswahili Shughuli Gredi 4", "Oxford", "Kiswahili", 640),
      item("g4-sci", "Science & Technology Grade 4", "Moran", "Science", 690),
      item("g4-sst", "Social Studies Grade 4", "Longhorn", "Social Studies", 600),
      item("g4-books", "A4 exercise books, 96 pg (×10)", "Kasuku", "Stationery", 550),
      item("g4-dict", "Primary Dictionary", "Oxford", "Reference", 1250, false),
      item("g4-readers", "Class readers set (4 books)", "Storymoja", "Readers", 1400, false),
    ],
  },
  {
    ...greenhillBase,
    id: "bl-g7",
    gradeName: "Grade 7",
    classNames: ["7 Blue", "7 Green", "7 Red"],
    items: [
      item("g7-math", "Mathematics Grade 7", "Longhorn", "Mathematics", 720),
      item("g7-sci", "Integrated Science Grade 7", "Longhorn", "Science", 760),
      item("g7-pts", "Pre-Technical Studies Grade 7", "Longhorn", "Pre-Technical", 700),
      item("g7-eng", "English Grade 7", "KLB", "English", 690),
      item("g7-geo", "Geometry set", "Kasuku", "Stationery", 300),
    ],
  },
  {
    ...greenhillBase,
    id: "bl-g1",
    gradeName: "Grade 1",
    classNames: ["1 Sun", "1 Moon"],
    items: [
      item("g1-eng", "English Activities Grade 1", "KLB", "English", 540),
      item("g1-math", "Mathematics Activities Grade 1", "Longhorn", "Mathematics", 540),
      item("g1-kis", "Kiswahili Shughuli Gredi 1", "Oxford", "Kiswahili", 520),
      item("g1-books", "A5 exercise books (×10)", "Kasuku", "Stationery", 400),
      item("g1-dict", "Picture dictionary", "Oxford", "Reference", 900, false),
    ],
  },
]

export const summarise = (b: Booklist) => {
  const { items, ...rest } = b
  return {
    ...rest,
    itemCount: items.length,
    requiredTotalCents: items.filter((i) => i.required).reduce((s, i) => s + i.unitPriceCents * i.qtyPerStudent, 0),
  }
}

export const orders: Order[] = [
  {
    id: "ord-20418",
    number: "SS-20418",
    status: "in_fulfilment",
    studentName: "Zawadi",
    schoolName: "Greenhill Academy",
    className: "7 Blue",
    subtotalCents: k(5980),
    totalCents: k(5980),
    collectionCode: "4829",
    paidAt: "2027-01-05T09:12:00+03:00",
    mpesaReceipt: "QAB4X7K2LM",
    expectedAtSchool: "2027-01-20",
    collectedAt: null,
    items: [
      { id: "oi-1", title: "Mathematics Grade 7", publisherName: "Longhorn", qty: 1, unitPriceCents: k(720), status: "active" },
      { id: "oi-2", title: "Integrated Science Grade 7", publisherName: "Longhorn", qty: 1, unitPriceCents: k(760), status: "active" },
      { id: "oi-3", title: "Pre-Technical Studies Grade 7", publisherName: "Longhorn", qty: 1, unitPriceCents: k(700), status: "active" },
      { id: "oi-4", title: "Social Studies Grade 7", publisherName: "Longhorn", qty: 1, unitPriceCents: k(690), status: "active" },
      { id: "oi-5", title: "English Grade 7", publisherName: "KLB", qty: 1, unitPriceCents: k(690), status: "active" },
      { id: "oi-6", title: "Kiswahili Grade 7", publisherName: "KLB", qty: 1, unitPriceCents: k(680), status: "active" },
      { id: "oi-7", title: "CRE Grade 7", publisherName: "KLB", qty: 1, unitPriceCents: k(650), status: "active" },
      { id: "oi-8", title: "A4 exercise books, 96 pg (×10)", publisherName: "Kasuku", qty: 1, unitPriceCents: k(550), status: "active" },
      { id: "oi-9", title: "Geometry set", publisherName: "Kasuku", qty: 1, unitPriceCents: k(300), status: "active" },
      { id: "oi-10", title: "HB pencils, pack of 12", publisherName: "Kasuku", qty: 1, unitPriceCents: k(240), status: "active" },
    ],
    shipments: [
      { publisherName: "Longhorn", summary: "4 textbooks", status: "dispatched" },
      { publisherName: "KLB", summary: "3 textbooks", status: "dispatched" },
      { publisherName: "Kasuku", summary: "Exercise books, geometry set, pencils", status: "ready_to_pack" },
    ],
  },
]

export const children: Child[] = [
  {
    id: "stu-amani",
    name: "Amani",
    admissionNo: "GA-2291",
    schoolId: "sch-greenhill",
    schoolName: "Greenhill Academy",
    gradeName: "Grade 4",
    className: "4 East",
    openBooklist: summarise(booklists[0]),
    latestOrder: null,
  },
  {
    id: "stu-zawadi",
    name: "Zawadi",
    admissionNo: "GA-1870",
    schoolId: "sch-greenhill",
    schoolName: "Greenhill Academy",
    gradeName: "Grade 7",
    className: "7 Blue",
    openBooklist: null,
    latestOrder: { id: "ord-20418", number: "SS-20418", status: "in_fulfilment", expectedAtSchool: "2027-01-20" },
  },
]

export const products: Product[] = [
  { id: "prd-g4-math", title: "Mathematics Activities Grade 4", imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=640&q=80", publisherName: "Longhorn", subject: "Mathematics", gradeLabel: "Grade 4", gradeBand: "4-6", priceCents: k(650), schoolListCount: 38, category: "textbook", curricula: ["cbe"], audience: "school" },
  { id: "prd-g4-eng", title: "English Activities Grade 4", imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=640&q=80", publisherName: "KLB", subject: "English", gradeLabel: "Grade 4", gradeBand: "4-6", priceCents: k(620), schoolListCount: 31, category: "textbook", curricula: ["cbe"], audience: "school" },
  { id: "prd-g4-kis", title: "Kiswahili Shughuli Gredi 4", imageUrl: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=640&q=80", publisherName: "Oxford", subject: "Kiswahili", gradeLabel: "Grade 4", gradeBand: "4-6", priceCents: k(640), schoolListCount: 29, category: "textbook", curricula: ["cbe"], audience: "school" },
  { id: "prd-g7-sci", title: "Integrated Science Grade 7", imageUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=640&q=80", publisherName: "Longhorn", subject: "Integrated Science", gradeLabel: "Grade 7", gradeBand: "7-9", priceCents: k(760), schoolListCount: 27, category: "textbook", curricula: ["cbe"], audience: "school" },
  { id: "prd-g7-math", title: "Mathematics Grade 7", imageUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=640&q=80", publisherName: "Longhorn", subject: "Mathematics", gradeLabel: "Grade 7", gradeBand: "7-9", priceCents: k(720), schoolListCount: 44, category: "textbook", curricula: ["cbe"], audience: "school" },
  { id: "prd-g1-eng", title: "English Activities Grade 1", imageUrl: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=640&q=80", publisherName: "KLB", subject: "English", gradeLabel: "Grade 1", gradeBand: "1-3", priceCents: k(540), schoolListCount: 22, category: "textbook", curricula: ["cbe"], audience: "school" },
  { id: "prd-pp2-lang", title: "Language Activities PP2", imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=640&q=80", publisherName: "Moran", subject: "Language Activities", gradeLabel: "PP2", gradeBand: "pp", priceCents: k(480), schoolListCount: 15, category: "textbook", curricula: ["cbe"], audience: "school" },
  { id: "prd-books", title: "A4 exercise books, 96 pg (×10)", imageUrl: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=640&q=80", publisherName: "Kasuku", subject: "Exercise books", gradeLabel: "All grades", gradeBand: "all", priceCents: k(550), schoolListCount: 41, category: "stationery", audience: "all", department: "writing" },
  { id: "prd-geometry", title: "Geometry set", imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=640&q=80", publisherName: "Kasuku", subject: "Maths supplies", gradeLabel: "All grades", gradeBand: "all", priceCents: k(300), schoolListCount: 12, category: "stationery", audience: "all", department: "maths" },
  { id: "prd-pencils", title: "HB pencils, pack of 12", imageUrl: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=640&q=80", publisherName: "Kasuku", subject: "Writing supplies", gradeLabel: "All grades", gradeBand: "all", priceCents: k(240), schoolListCount: 9, category: "stationery", audience: "all", department: "writing" },
  { id: "prd-calculator", title: "Scientific calculator", imageUrl: "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=640&q=80", publisherName: "Oxford", subject: "Calculators", gradeLabel: "Grade 7+", gradeBand: "7-9", priceCents: k(1450), schoolListCount: 4, category: "stationery", audience: "all", department: "maths" },
  { id: "prd-college-business", title: "Introduction to Business Management", imageUrl: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=640&q=80", publisherName: "Oxford", subject: "Business Management", gradeLabel: "College", gradeBand: "all", priceCents: k(1850), schoolListCount: 0, category: "college", audience: "college", faculty: "business", curricula: [] },
  { id: "prd-college-computing", title: "Foundations of Computing", imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=640&q=80", publisherName: "Pearson", subject: "Computing & IT", gradeLabel: "College", gradeBand: "all", priceCents: k(2200), schoolListCount: 0, category: "college", audience: "college", faculty: "ict", curricula: [] },
]

type ProductExtra = Pick<ProductDetail, "description" | "isbn" | "pages" | "format">

const productExtras: Record<string, ProductExtra> = {
  "prd-g4-math": { description: "CBC-aligned learner's book with a worked example and practice activity for every lesson: numbers to 100,000, fractions, measurement, geometry and data handling.", isbn: "978-9966-36-412-8", pages: 184, format: "Paperback, A4" },
  "prd-g4-eng": { description: "Reading passages, grammar and writing activities for the Grade 4 English curriculum, with listening and speaking tasks for class work.", isbn: "978-9966-44-218-3", pages: 168, format: "Paperback, A4" },
  "prd-g4-kis": { description: "Kitabu cha mwanafunzi kinachofuata mtaala wa CBC: kusoma, sarufi, kuandika na mazoezi ya kusikiliza na kuzungumza.", isbn: "978-0-19-573904-1", pages: 160, format: "Paperback, A4" },
  "prd-g7-sci": { description: "Junior School Integrated Science covering scientific investigation, mixtures, living things, the human body and force and energy, with practical activities.", isbn: "978-9966-36-655-9", pages: 248, format: "Paperback, A4" },
  "prd-g7-math": { description: "Grade 7 Mathematics for Junior School: integers, algebraic expressions, linear equations, geometry and probability, with end-of-strand assessments.", isbn: "978-9966-36-640-5", pages: 236, format: "Paperback, A4" },
  "prd-g1-eng": { description: "Colourful early-reading activities: phonics, picture reading, letter formation and short stories for Grade 1 learners.", isbn: "978-9966-44-102-5", pages: 112, format: "Paperback, A4" },
  "prd-pp2-lang": { description: "Pre-primary language activities with tracing, sound recognition, songs and picture talk, designed for PP2 classrooms.", isbn: "978-9966-63-311-7", pages: 96, format: "Paperback, A4" },
  "prd-books": { description: "Pack of ten A4 exercise books, 96 pages each, ruled with margin. The standard exercise book on most school lists.", isbn: null, pages: 96, format: "Pack of 10" },
}

export function productDetail(product: Product): ProductDetail {
  const extra = productExtras[product.id] ?? { description: "", isbn: null, pages: null, format: "Paperback" }
  const related = products
    .filter((p) => p.id !== product.id && (p.gradeLabel === product.gradeLabel || p.subject === product.subject || p.gradeBand === "all"))
    .slice(0, 4)
  return {
    ...product,
    ...extra,
    kicdApproved: product.gradeBand !== "all",
    onSchoolLists: schools.slice(0, 3).map(({ slug, name, town }) => ({ slug, name, town })),
    related,
  }
}

export const schoolOverview: SchoolOverview = {
  schoolName: "Greenhill Academy",
  termName: "Term 1, 2027",
  studentsOrdered: 271,
  studentsTotal: 480,
  orderDeadline: "2027-01-10",
  deliveriesReceived: 2,
  deliveriesExpected: 5,
  packsCollected: 0,
  booklists: [
    { ...summarise(booklists[2]), ordered: 58, students: 90 },
    { ...summarise(booklists[0]), ordered: 63, students: 120 },
    { ...summarise(booklists[1]), ordered: 150, students: 270 },
  ],
  deliveries: [
    { id: "dl-1", publisherName: "Longhorn", packs: 271, status: "received", date: "2027-01-09" },
    { id: "dl-2", publisherName: "Moran", packs: 63, status: "received", date: "2027-01-09" },
    { id: "dl-3", publisherName: "KLB", packs: 213, status: "dispatched", date: "2027-01-14" },
    { id: "dl-4", publisherName: "Oxford", packs: 121, status: "dispatched", date: "2027-01-15" },
    { id: "dl-5", publisherName: "Kasuku", packs: 271, status: "ready_to_pack", date: null },
  ],
}

/*
 * Greenhill's parent orders: one row per enrolled student (480), generated
 * from a fixed seed so the numbers match the overview (271 paid).
 */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const firstNames = ["Zawadi", "Baraka", "Imani", "Kiprono", "Wanjiru", "Otieno", "Akinyi", "Kamau", "Njeri", "Mutua", "Chebet", "Odhiambo", "Wambui", "Kiptoo", "Nyambura", "Omondi", "Atieno", "Mwangi", "Jepkosgei", "Kibet", "Muthoni", "Ochieng", "Wairimu", "Cheruiyot", "Auma", "Njoroge", "Nekesa", "Wekesa", "Makena", "Kirui"]
const surnames = ["Otieno", "Kamau", "Wanjiku", "Kiprop", "Mwangi", "Achieng", "Njoroge", "Mutiso", "Koech", "Odera", "Maina", "Chepkemoi", "Owino", "Gitau", "Rotich", "Wafula", "Nduta", "Kimani", "Barasa", "Langat"]
const parentFirst = ["Achieng", "Grace", "Peter", "Mary", "John", "Faith", "David", "Esther", "Joseph", "Lucy", "Samuel", "Ruth", "James", "Mercy", "Daniel"]
const shipmentByPublisher = Object.fromEntries(schoolOverview.deliveries.map((d) => [d.publisherName, d.status]))

const gradePlan = [
  { list: booklists[2], classes: [45, 45], paid: 58, pending: 4, failed: 1, year: 2026 },
  { list: booklists[0], classes: [40, 40, 40], paid: 63, pending: 7, failed: 2, year: 2023 },
  { list: booklists[1], classes: [90, 90, 90], paid: 150, pending: 5, failed: 1, year: 2020 },
]

export const schoolOrderRows: StudentOrderRow[] = []
export const schoolOrderDetails: SchoolOrderDetail[] = []
{
  const rand = seeded(2027)
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)]
  let adm = 1, orderNo = 19000
  for (const g of gradePlan) {
    const students = g.list.classNames.flatMap((className, ci) => Array.from({ length: g.classes[ci] }, () => className))
    // Spread paid / pending / failed orders across the grade's classes.
    const statuses: Array<"paid" | "pending_payment" | "payment_failed" | null> = students.map((_, i) => (i < g.paid ? "paid" : i < g.paid + g.pending ? "pending_payment" : i < g.paid + g.pending + g.failed ? "payment_failed" : null))
    for (let i = statuses.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[statuses[i], statuses[j]] = [statuses[j], statuses[i]]
    }
    students.forEach((className, i) => {
      const first = g.list.gradeName === "Grade 7" && i === 0 ? "Zawadi" : pick(firstNames)
      const last = pick(surnames)
      const hasParent = statuses[i] !== null || rand() > 0.09
      const status = statuses[i]
      const row: StudentOrderRow = {
        studentId: `stu-${adm}`,
        studentName: `${first} ${last}`,
        admissionNo: `GH/${g.year}/${String(adm).padStart(4, "0")}`,
        gradeName: g.list.gradeName,
        className,
        parentName: hasParent ? `${pick(parentFirst)} ${last}` : null,
        parentPhone: hasParent ? `07${Math.floor(rand() * 10)}${Math.floor(rand() * 10)} ••• ${String(Math.floor(rand() * 1000)).padStart(3, "0")}` : null,
        order: null,
        remindedAt: !status && hasParent && rand() < 0.15 ? new Date(Date.now() - (1 + rand() * 5) * 3_600_000).toISOString() : null,
      }
      adm++
      if (status) {
        const items = g.list.items
          .filter((it) => it.required || rand() < 0.4)
          .map((it, n) => ({ id: `${row.studentId}-${n}`, title: it.title, publisherName: it.publisherName, qty: it.qtyPerStudent, unitPriceCents: it.unitPriceCents, status: "active" as const }))
        const total = items.reduce((t, it) => t + it.unitPriceCents * it.qty, 0)
        const paid = status === "paid"
        const paidAt = paid ? `2026-12-${String(10 + Math.floor(rand() * 21)).padStart(2, "0")}T${String(7 + Math.floor(rand() * 13)).padStart(2, "0")}:${String(Math.floor(rand() * 60)).padStart(2, "0")}:00+03:00` : null
        const number = `SS-${orderNo++}`
        const id = `ord-${number.slice(3)}`
        row.order = { id, number, status: paid ? "in_fulfilment" : status, totalCents: total, itemCount: items.length, paidAt }
        const publishers = [...new Set(items.map((it) => it.publisherName))]
        schoolOrderDetails.push({
          id,
          number,
          status: row.order.status,
          studentName: row.studentName,
          schoolName: g.list.schoolName,
          className,
          subtotalCents: total,
          totalCents: total,
          collectionCode: null,
          paidAt,
          mpesaReceipt: paid ? "Q" + Array.from({ length: 9 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(rand() * 32)]).join("") : null,
          expectedAtSchool: paid ? g.list.deliverBy : null,
          collectedAt: null,
          items,
          shipments: publishers.map((publisherName) => {
            const n = items.filter((it) => it.publisherName === publisherName).length
            return { publisherName, summary: `${n} item${n === 1 ? "" : "s"}`, status: paid ? (shipmentByPublisher[publisherName] ?? "collecting") : "collecting" }
          }),
          admissionNo: row.admissionNo,
          parentName: row.parentName,
          parentPhone: row.parentPhone,
        })
      }
      schoolOrderRows.push(row)
    })
  }
}

/** Longhorn's own catalog, as the demo publisher sees it. */
export const publisherCatalog: CatalogItem[] = [
  { id: "cat-g4-math", title: "Mathematics Activities Grade 4", subject: "Mathematics", gradeLabel: "Grade 4", gradeBand: "4-6", isbn: "978-9966-36-412-8", format: "Paperback, A4", priceCents: k(650), stock: 1240, lowStockAt: 200, status: "live", schoolListCount: 38 },
  { id: "cat-g4-sst", title: "Social Studies Grade 4", subject: "Social Studies", gradeLabel: "Grade 4", gradeBand: "4-6", isbn: "978-9966-36-418-0", format: "Paperback, A4", priceCents: k(600), stock: 140, lowStockAt: 200, status: "live", schoolListCount: 26 },
  { id: "cat-g7-math", title: "Mathematics Grade 7", subject: "Mathematics", gradeLabel: "Grade 7", gradeBand: "7-9", isbn: "978-9966-36-640-5", format: "Paperback, A4", priceCents: k(720), stock: 2100, lowStockAt: 300, status: "live", schoolListCount: 44 },
  { id: "cat-g7-sci", title: "Integrated Science Grade 7", subject: "Integrated Science", gradeLabel: "Grade 7", gradeBand: "7-9", isbn: "978-9966-36-655-9", format: "Paperback, A4", priceCents: k(760), stock: 0, lowStockAt: 300, status: "live", schoolListCount: 27 },
  { id: "cat-g7-pts", title: "Pre-Technical Studies Grade 7", subject: "Pre-Technical Studies", gradeLabel: "Grade 7", gradeBand: "7-9", isbn: "978-9966-36-662-7", format: "Paperback, A4", priceCents: k(690), stock: 880, lowStockAt: 200, status: "live", schoolListCount: 12 },
  { id: "cat-g1-math", title: "Mathematics Activities Grade 1", subject: "Mathematics", gradeLabel: "Grade 1", gradeBand: "1-3", isbn: "978-9966-36-301-5", format: "Paperback, A4", priceCents: k(520), stock: 95, lowStockAt: 150, status: "live", schoolListCount: 19 },
  { id: "cat-g8-math", title: "Mathematics Grade 8", subject: "Mathematics", gradeLabel: "Grade 8", gradeBand: "7-9", isbn: null, format: "Paperback, A4", priceCents: k(740), stock: 0, lowStockAt: 300, status: "draft", schoolListCount: 0 },
]

export const publisherBatches: SchoolBatch[] = [
  { id: "bt-1", schoolName: "Greenhill Academy", town: "Nakuru", packs: 312, valueCents: k(187200), dueAtSchool: "2027-01-20", status: "ready_to_pack", collectingUntil: null, unavailableLines: [], dispatch: null, receipt: null,
    lines: [{ title: "Mathematics Activities Grade 4", qty: 63 }, { title: "Social Studies Grade 4", qty: 63 }, { title: "Mathematics Grade 7", qty: 150 }, { title: "Integrated Science Grade 7", qty: 150 }] },
  { id: "bt-2", schoolName: "St. Mary's Primary", town: "Eldoret", packs: 204, valueCents: k(118300), dueAtSchool: "2027-01-18", status: "ready_to_pack", collectingUntil: null, unavailableLines: [], dispatch: null, receipt: null,
    lines: [{ title: "Mathematics Activities Grade 1", qty: 88 }, { title: "English Activities Grade 1", qty: 88 }, { title: "Social Studies Grade 4", qty: 116 }] },
  { id: "bt-3", schoolName: "Riverside Junior School", town: "Kisumu", packs: 178, valueCents: k(107100), dueAtSchool: "2027-01-22", status: "ready_to_pack", collectingUntil: null, unavailableLines: [], dispatch: null, receipt: null,
    lines: [{ title: "Mathematics Grade 7", qty: 178 }, { title: "Pre-Technical Studies Grade 7", qty: 178 }] },
  { id: "bt-4", schoolName: "Kilimani Primary", town: "Nairobi", packs: 96, valueCents: k(52800), dueAtSchool: "2027-01-24", status: "collecting", collectingUntil: "2027-01-12", unavailableLines: [], dispatch: null, receipt: null,
    lines: [{ title: "Mathematics Activities Grade 4", qty: 96 }] },
  { id: "bt-5", schoolName: "Hillcrest Prep", town: "Nyeri", packs: 140, valueCents: k(84000), dueAtSchool: "2027-01-09", status: "dispatched", collectingUntil: null, unavailableLines: [], receipt: null,
    dispatch: { deliveryNoteNo: "DN-1042", carrier: "Own vehicle", driverName: "Joseph Mwangi", driverPhone: "254711222333", vehicleReg: "KDA 412K", cartons: 18, dispatchedAt: "2027-01-07T07:30:00+03:00", expectedAt: "2027-01-08" },
    lines: [{ title: "Mathematics Activities Grade 4", qty: 70 }, { title: "Social Studies Grade 4", qty: 70 }] },
  { id: "bt-6", schoolName: "Sunrise Academy", town: "Machakos", packs: 120, valueCents: k(73200), dueAtSchool: "2027-01-08", status: "received", collectingUntil: null, unavailableLines: [],
    dispatch: { deliveryNoteNo: "DN-1038", carrier: "G4S Courier", driverName: "Kevin Otieno", driverPhone: "254722444555", vehicleReg: "KCZ 908T", cartons: 15, dispatchedAt: "2027-01-05T08:10:00+03:00", expectedAt: "2027-01-06" },
    receipt: { receivedAt: "2027-01-06T11:20:00+03:00", receivedBy: "Mary Wanjiku, deputy head", issue: "6 packs short: Social Studies Grade 4", payout: "queued" },
    lines: [{ title: "Mathematics Activities Grade 4", qty: 60 }, { title: "Social Studies Grade 4", qty: 60 }] },
  { id: "bt-7", schoolName: "Lakeview Primary", town: "Naivasha", packs: 88, valueCents: k(57200), dueAtSchool: "2027-01-07", status: "received", collectingUntil: null, unavailableLines: ["Pre-Technical Studies Grade 7"],
    dispatch: { deliveryNoteNo: "DN-1031", carrier: "Own vehicle", driverName: "Joseph Mwangi", driverPhone: "254711222333", vehicleReg: "KDA 412K", cartons: 11, dispatchedAt: "2027-01-04T07:45:00+03:00", expectedAt: "2027-01-04" },
    receipt: { receivedAt: "2027-01-04T14:05:00+03:00", receivedBy: "Daniel Kiprop, head teacher", issue: null, payout: "paid" },
    lines: [{ title: "Mathematics Grade 7", qty: 88 }, { title: "Pre-Technical Studies Grade 7", qty: 88 }] },
]

/** Commission rate used by the mock only; the real rate is agreed per publisher. */
const DEMO_COMMISSION = 0.08
const payout = (p: Omit<PublisherPayouts["payouts"][number], "commissionCents" | "netCents">) => {
  const commissionCents = Math.round(p.grossCents * DEMO_COMMISSION)
  return { ...p, commissionCents, netCents: p.grossCents - commissionCents - p.deductionsCents }
}

export const publisherPayouts: PublisherPayouts = {
  commissionRate: DEMO_COMMISSION,
  account: { method: "mpesa_paybill", accountName: "Longhorn Publishers Ltd", masked: "Paybill 522 *** 11 · Account LONGHORN", status: "verified" },
  payouts: [
    payout({ id: "po-7", termName: "Term 1, 2027", schoolName: "Hillcrest Prep", town: "Nyeri", deliveryNoteNo: "DN-1042", receivedAt: null, grossCents: k(84000), deductionsCents: 0, deductionNote: null, status: "held", paidAt: null, reference: null }),
    payout({ id: "po-6", termName: "Term 1, 2027", schoolName: "Sunrise Academy", town: "Machakos", deliveryNoteNo: "DN-1038", receivedAt: "2027-01-06T11:20:00+03:00", grossCents: k(73200), deductionsCents: k(3600), deductionNote: "6 packs short: Social Studies Grade 4, refunded to parents", status: "on_hold", paidAt: null, reference: null }),
    payout({ id: "po-5", termName: "Term 1, 2027", schoolName: "Kitale Hills School", town: "Kitale", deliveryNoteNo: "DN-1035", receivedAt: "2027-01-05T15:40:00+03:00", grossCents: k(66000), deductionsCents: 0, deductionNote: null, status: "queued", paidAt: null, reference: null }),
    payout({ id: "po-4", termName: "Term 1, 2027", schoolName: "Lakeview Primary", town: "Naivasha", deliveryNoteNo: "DN-1031", receivedAt: "2027-01-04T14:05:00+03:00", grossCents: k(57200), deductionsCents: 0, deductionNote: null, status: "paid", paidAt: "2027-01-05T10:00:00+03:00", reference: "QBR7X2K9LM" }),
    payout({ id: "po-3", termName: "Term 3, 2026", schoolName: "Greenhill Academy", town: "Nakuru", deliveryNoteNo: "DN-0988", receivedAt: "2026-09-08T09:30:00+03:00", grossCents: k(142500), deductionsCents: 0, deductionNote: null, status: "paid", paidAt: "2026-09-10T10:00:00+03:00", reference: "QIH4M8T2PA" }),
    payout({ id: "po-2", termName: "Term 3, 2026", schoolName: "St. Mary's Primary", town: "Eldoret", deliveryNoteNo: "DN-0979", receivedAt: "2026-09-06T12:10:00+03:00", grossCents: k(96800), deductionsCents: k(1240), deductionNote: "2 copies damaged: Mathematics Activities Grade 1, refunded to parents", status: "paid", paidAt: "2026-09-08T10:00:00+03:00", reference: "QIF2L7R5WD" }),
    payout({ id: "po-1", termName: "Term 3, 2026", schoolName: "Kilimani Primary", town: "Nairobi", deliveryNoteNo: "DN-0971", receivedAt: "2026-09-03T08:45:00+03:00", grossCents: k(41250), deductionsCents: 0, deductionNote: null, status: "paid", paidAt: "2026-09-05T10:00:00+03:00", reference: "QIC9P3D6NE" }),
  ],
}

export const publisherSettings: PublisherSettings = {
  profile: {
    companyName: "Longhorn Publishers Ltd",
    kraPin: "P051234567X",
    verifiedAt: "2026-08-14T10:00:00+03:00",
    contactName: "Peter Kamau",
    phone: "254700000444",
    email: "orders@longhorn.co.ke",
    dispatchAddress: "Funzi Road, Industrial Area, Nairobi",
    county: "Nairobi",
  },
  team: [
    { id: "tm-1", name: "Peter Kamau", contact: "254700000444", role: "admin", status: "active", isYou: true },
    { id: "tm-2", name: "Joseph Mwangi", contact: "254711222333", role: "warehouse", status: "active", isYou: false },
    { id: "tm-3", name: "Ann Njeri", contact: "ann.njeri@longhorn.co.ke", role: "finance", status: "active", isYou: false },
    { id: "tm-4", name: "Brian Otieno", contact: "254733111222", role: "warehouse", status: "invited", isYou: false },
  ],
  notifications: {
    batch_ready: { sms: true, email: true },
    delivery_issue: { sms: true, email: true },
    payout_sent: { sms: false, email: true },
    low_stock: { sms: false, email: true },
    weekly_summary: { sms: false, email: true },
  },
}

export const adminOverview: AdminOverview = {
  termName: "Term 1, 2027",
  salesCents: k(4_820_000),
  paidOrders: 1284,
  heldCents: k(2_100_000),
  mpesaSuccessRate: 0.961,
  liveSchools: 41,
  livePublishers: 9,
  alerts: [
    { id: "al-1", severity: "high", title: "3 schools waiting for verification", detail: "Oldest: 2 days ago", href: "/admin/organisations" },
    { id: "al-2", severity: "high", title: "2 publisher applications", detail: "Documents uploaded", href: "/admin/organisations" },
    { id: "al-3", severity: "medium", title: "4 M-Pesa payments not confirmed", detail: "No callback after 2 minutes, status check queued", href: "/admin/payments" },
    { id: "al-4", severity: "medium", title: "1 short-delivery dispute", detail: "Hillcrest Prep · Moran · 6 packs", href: "/admin/payments" },
    { id: "al-5", severity: "info", title: "6 refunds to approve", detail: "Out-of-stock lines, KES 7,980", href: "/admin/payments" },
  ],
}

const user = (id: string, name: string, phone: string, roles: User["roles"], memberships: User["memberships"] = [], email: string | null = null): User => ({
  id, name, phone, email, roles, memberships,
})

/**
 * Demo accounts, keyed by phone (2547XXXXXXXX). In mock mode every one-time
 * code is 123456 and every demo password is "schoolshop1".
 */
export const demoUsers: Record<string, User> = {
  "254712345678": user("usr-parent", "Achieng Otieno", "254712345678", ["parent"]),
  "254722000111": user("usr-school", "Grace Wambui", "254722000111", ["school_admin"], [
    { orgId: "sch-greenhill", orgName: "Greenhill Academy", orgType: "school", role: "school_admin" },
  ], "grace@greenhill.ac.ke"),
  "254700000444": user("usr-pub", "Peter Kamau", "254700000444", ["publisher"], [
    { orgId: "pub-longhorn", orgName: "Longhorn Publishers", orgType: "publisher", role: "publisher" },
  ]),
  "254799000999": user("usr-admin", "SchoolShop Ops", "254799000999", ["platform_admin"], [
    { orgId: "platform", orgName: "SchoolShop", orgType: "platform", role: "platform_admin" },
  ]),
}

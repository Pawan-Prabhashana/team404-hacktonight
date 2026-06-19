/**
 * Rule-based transaction categorization engine — Phase 8.
 *
 * Assigns a category slug to each transaction based on description keywords,
 * transaction type, and biller category. No external ML model is used.
 * The data structure is ML-ready: slug + confidence + reason.
 */

export type CategoryMeta = {
  name: string
  slug: string
  color: string
  icon: string
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  groceries: {
    name: 'Groceries',
    slug: 'groceries',
    color: '#22c55e',
    icon: 'G'
  },
  utilities: {
    name: 'Utilities',
    slug: 'utilities',
    color: '#3b82f6',
    icon: 'U'
  },
  dining: { name: 'Dining', slug: 'dining', color: '#f97316', icon: 'D' },
  transport: {
    name: 'Transport',
    slug: 'transport',
    color: '#8b5cf6',
    icon: 'T'
  },
  shopping: { name: 'Shopping', slug: 'shopping', color: '#ec4899', icon: 'S' },
  subscriptions: {
    name: 'Subscriptions',
    slug: 'subscriptions',
    color: '#6366f1',
    icon: 'P'
  },
  salary: { name: 'Salary', slug: 'salary', color: '#10b981', icon: 'Y' },
  transfers: {
    name: 'Transfers',
    slug: 'transfers',
    color: '#64748b',
    icon: 'X'
  },
  bills: { name: 'Bills', slug: 'bills', color: '#f59e0b', icon: 'B' },
  education: {
    name: 'Education',
    slug: 'education',
    color: '#0ea5e9',
    icon: 'E'
  },
  insurance: {
    name: 'Insurance',
    slug: 'insurance',
    color: '#14b8a6',
    icon: 'I'
  },
  travel: { name: 'Travel', slug: 'travel', color: '#f43f5e', icon: 'V' },
  other: { name: 'Other', slug: 'other', color: '#9ca3af', icon: 'O' }
}

export function getCategoryMeta(slug: string): CategoryMeta {
  return CATEGORY_META[slug] ?? CATEGORY_META.other
}

export function getAllCategories(): CategoryMeta[] {
  return Object.values(CATEGORY_META)
}

type CategorizeInput = {
  type?: string | null
  description?: string | null
  direction?: string | null
  billerCategory?: string | null
  isCredit?: boolean
}

type CategorizeResult = {
  categorySlug: string
  confidence: number
  reason: string
}

function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
}

const RULES: Array<{
  match: (
    desc: string,
    type: string,
    billerCat: string,
    isCredit: boolean
  ) => boolean
  slug: string
  confidence: number
  reason: string
}> = [
  // ── Income ──
  {
    match: (d, _t, _b, isCredit) =>
      isCredit &&
      /salary|payroll|income|wages|bonus|commission|stipend/.test(d),
    slug: 'salary',
    confidence: 0.95,
    reason: 'salary/income keyword'
  },
  // ── Bill payments by biller category ──
  {
    match: (_d, t, b) => t === 'bill_payment' && b === 'utilities',
    slug: 'utilities',
    confidence: 0.95,
    reason: 'bill_payment: utilities biller'
  },
  {
    match: (_d, t, b) =>
      t === 'bill_payment' && (b === 'mobile' || b === 'internet'),
    slug: 'subscriptions',
    confidence: 0.9,
    reason: 'bill_payment: mobile/internet biller'
  },
  {
    match: (_d, t, b) => t === 'bill_payment' && b === 'insurance',
    slug: 'insurance',
    confidence: 0.95,
    reason: 'bill_payment: insurance biller'
  },
  {
    match: (_d, t, b) => t === 'bill_payment' && b === 'education',
    slug: 'education',
    confidence: 0.95,
    reason: 'bill_payment: education biller'
  },
  {
    match: (_d, t, b) =>
      t === 'bill_payment' && (b === 'government' || b === 'credit_card'),
    slug: 'bills',
    confidence: 0.9,
    reason: 'bill_payment: government/credit card biller'
  },
  {
    match: (_d, t, b) => t === 'bill_payment' && b === 'other',
    slug: 'bills',
    confidence: 0.75,
    reason: 'bill_payment: other biller'
  },
  // ── Description-based: groceries ──
  {
    match: (d) =>
      /keells|cargills|laugfs|spar|arpico|supermarket|grocery|food city|fresh market|hypermarket/.test(
        d
      ),
    slug: 'groceries',
    confidence: 0.92,
    reason: 'grocery store keyword'
  },
  // ── Description-based: dining ──
  {
    match: (d) =>
      /restaurant|cafe|coffee|lunch|dinner|breakfast|takeaway|takeout|burger|pizza|kfc|mcdonalds|noodle|sushi|biryani|kottu|dine/.test(
        d
      ),
    slug: 'dining',
    confidence: 0.9,
    reason: 'dining keyword'
  },
  // ── Description-based: transport ──
  {
    match: (d) =>
      /pickme|uber|taxi|fuel|petrol|diesel|bus|train|tuk|transport|commute|highway|toll|parking/.test(
        d
      ),
    slug: 'transport',
    confidence: 0.9,
    reason: 'transport keyword'
  },
  // ── Description-based: subscriptions ──
  {
    match: (d) =>
      /netflix|spotify|amazon prime|disney|hulu|youtube premium|subscription|apple music|deezer|gaming|steam|adobe|microsoft 365/.test(
        d
      ),
    slug: 'subscriptions',
    confidence: 0.92,
    reason: 'subscription service keyword'
  },
  // ── Description-based: utilities (direct payment) ──
  {
    match: (d) =>
      /electricity|ceb|water board|nwsdb|slt|fiber|internet bill|broadband/.test(
        d
      ),
    slug: 'utilities',
    confidence: 0.88,
    reason: 'utility keyword'
  },
  // ── Description-based: shopping ──
  {
    match: (d) =>
      /odel|clothing|amazon|shopee|daraz|fashion|mall|boutique|purchase|shoes|apparel|household|hardware|furniture/.test(
        d
      ),
    slug: 'shopping',
    confidence: 0.85,
    reason: 'shopping keyword'
  },
  // ── Description-based: education ──
  {
    match: (d) =>
      /school|university|tuition|course|exam|certification|training|textbook|education/.test(
        d
      ),
    slug: 'education',
    confidence: 0.88,
    reason: 'education keyword'
  },
  // ── Description-based: insurance ──
  {
    match: (d) =>
      /insurance|aia|allianz|ceylinco|sri lanka insurance|premium.*life|health cover/.test(
        d
      ),
    slug: 'insurance',
    confidence: 0.88,
    reason: 'insurance keyword'
  },
  // ── Description-based: travel ──
  {
    match: (d) =>
      /airline|flight|hotel|resort|airbnb|travel|holiday|vacation|booking|expedia|trip/.test(
        d
      ),
    slug: 'travel',
    confidence: 0.88,
    reason: 'travel keyword'
  },
  // ── Internal transfers ──
  {
    match: (_d, t) => t === 'transfer',
    slug: 'transfers',
    confidence: 0.5,
    reason: 'generic transfer fallback'
  }
]

export function categorizeTransaction(
  input: CategorizeInput
): CategorizeResult {
  const desc = norm(input.description)
  const type = (input.type ?? '').toLowerCase()
  const billerCat = (input.billerCategory ?? '').toLowerCase()
  const isCredit = input.isCredit ?? false

  for (const rule of RULES) {
    if (rule.match(desc, type, billerCat, isCredit)) {
      return {
        categorySlug: rule.slug,
        confidence: rule.confidence,
        reason: rule.reason
      }
    }
  }

  return {
    categorySlug: 'other',
    confidence: 0.4,
    reason: 'no matching rule — fallback'
  }
}

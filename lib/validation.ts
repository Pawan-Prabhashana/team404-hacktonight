/**
 * Validation foundation for NOVA Bank.
 *
 * Built on Zod v4. Add new schemas here as API routes are hardened across phases.
 * Routes should validate all incoming data before it reaches the DB layer.
 *
 * Note: Zod v4 replaced `required_error` / `invalid_type_error` with a unified
 * `error` field. All schemas here use the v4 API.
 *
 * Usage:
 *   import { emailSchema, transferSchema, safeParse } from '@/lib/validation'
 *
 *   const result = safeParse(transferSchema, body)
 *   if (result.error) return badRequest(result.error)
 */
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const emailSchema = z
  .email('Please enter a valid email address.')
  .toLowerCase()
  .trim()

export const uuidSchema = z.uuid('Invalid ID format.')

export const positiveAmountSchema = z.coerce
  .number()
  .positive('Amount must be greater than zero.')
  .max(10_000_000, 'Amount exceeds the maximum transfer limit.')

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
})

export const dateRangeSchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date()
  })
  .refine((d) => d.from <= d.to, {
    message: 'Start date must be before or equal to end date.',
    path: ['from']
  })

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.').max(128)
})

// ---------------------------------------------------------------------------
// Transfer schemas (Phase 5 will expand these)
// ---------------------------------------------------------------------------

export const transferSchema = z.object({
  fromAccount: z.string().min(1, 'Source account is required.').max(30).trim(),
  toAccount: z
    .string()
    .min(1, 'Destination account is required.')
    .max(30)
    .trim(),
  amount: positiveAmountSchema,
  description: z.string().max(500).trim().optional().default('')
})

// ---------------------------------------------------------------------------
// Search schemas
// ---------------------------------------------------------------------------

export const searchSchema = z.object({
  q: z
    .string()
    .min(2, 'Search query must be at least 2 characters.')
    .max(100)
    .trim()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse and validate an object with a Zod schema.
 * Returns `{ data, error }` — never throws.
 */
export function safeParse<T>(
  schema: z.ZodType<T>,
  input: unknown
): { data: T; error: null } | { data: null; error: string } {
  const result = schema.safeParse(input)
  if (result.success) {
    return { data: result.data, error: null }
  }
  const issue = result.error.issues[0]
  return { data: null, error: issue?.message ?? 'Validation error.' }
}

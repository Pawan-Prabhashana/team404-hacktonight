/**
 * Validation schemas for Phase 4 banking APIs.
 *
 * Uses Zod v4. Integer IDs are used throughout to match the legacy DB schema.
 */
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Account schemas
// ---------------------------------------------------------------------------

export const accountIdSchema = z.coerce.number().int().positive()

export const accountIdParamSchema = z.object({
  accountId: accountIdSchema
})

export const updateAccountSchema = z
  .object({
    accountId: accountIdSchema,
    nickname: z.string().trim().min(1).max(40).optional(),
    status: z.enum(['active', 'frozen']).optional()
  })
  .refine((d) => d.nickname !== undefined || d.status !== undefined, {
    message: 'At least one of nickname or status is required.'
  })

// ---------------------------------------------------------------------------
// Transaction schemas
// ---------------------------------------------------------------------------

export const listTransactionsSchema = z.object({
  accountId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
})

// ---------------------------------------------------------------------------
// Beneficiary schemas
// ---------------------------------------------------------------------------

export const beneficiaryIdSchema = z.coerce.number().int().positive()

export const createBeneficiarySchema = z.object({
  name: z.string().trim().min(2).max(80),
  bankName: z.string().trim().min(2).max(80).default('NOVA Bank'),
  accountNumber: z.string().trim().min(6).max(34)
})

export const updateBeneficiaryTrustSchema = z.object({
  trustLevel: z.enum(['new', 'verified', 'trusted', 'blocked'])
})

// ---------------------------------------------------------------------------
// Notification schemas
// ---------------------------------------------------------------------------

export const notificationIdSchema = z.coerce.number().int().positive()

// ---------------------------------------------------------------------------
// Parse helper (mirrors lib/validation.ts safeParse)
// ---------------------------------------------------------------------------

export function parseBody<T>(
  schema: z.ZodType<T>,
  input: unknown
): { data: T; error: null } | { data: null; error: string } {
  const result = schema.safeParse(input)
  if (result.success) return { data: result.data, error: null }
  const issue = result.error.issues[0]
  return { data: null, error: issue?.message ?? 'Validation error.' }
}

export function parseParams<T>(
  schema: z.ZodType<T>,
  searchParams: URLSearchParams
): { data: T; error: null } | { data: null; error: string } {
  const raw: Record<string, string> = {}
  searchParams.forEach((v, k) => {
    raw[k] = v
  })
  const result = schema.safeParse(raw)
  if (result.success) return { data: result.data, error: null }
  const issue = result.error.issues[0]
  return { data: null, error: issue?.message ?? 'Validation error.' }
}

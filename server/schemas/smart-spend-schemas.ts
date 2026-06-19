/**
 * Zod validation schemas for Phase 8 Smart Spend APIs.
 * Never accepts userId — identity is always derived from the session cookie.
 */
import { z } from 'zod'

export const smartSpendQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  accountId: z.string().optional()
})

export const upsertBudgetSchema = z.object({
  categorySlug: z.string().trim().min(2).max(50),
  amount: z.union([z.string(), z.number()]),
  currency: z.string().trim().length(3).default('LKR'),
  period: z.enum(['monthly']).default('monthly')
})

export const financialTwinSchema = z.object({
  scenarioType: z.enum(['purchase', 'saving', 'bill_payment', 'transfer']),
  amount: z.union([z.string(), z.number()]),
  categorySlug: z.string().trim().min(2).max(50).optional(),
  accountId: z.string().optional(),
  description: z.string().trim().max(140).optional()
})

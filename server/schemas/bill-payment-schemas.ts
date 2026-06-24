/**
 * Bill payment validation schemas — Phase 7.
 *
 * Uses integer account/biller IDs to match the running DB schema (SERIAL ids),
 * mirroring the Phase 6 transfer schemas. Amount is accepted as string or
 * number and converted to positive minor units in the service layer.
 *
 * Rules:
 *   - userId is NEVER accepted from the body — it comes from the session.
 *   - Amount must resolve to positive minor units.
 *   - Bill reference is bounded (3–80 chars).
 *   - Currency defaults to LKR.
 */
import { z } from 'zod'
import { parseBody, parseParams } from '@/server/schemas/banking-schemas'

export const createBillPaymentSchema = z.object({
  accountId: z.coerce.number().int().positive({
    message: 'A source account is required.'
  }),
  billerId: z.coerce.number().int().positive({
    message: 'A biller is required.'
  }),
  billReference: z.string().trim().min(3).max(80),
  amount: z
    .union([z.string(), z.number()])
    .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, {
      message: 'Amount must be a positive number.'
    }),
  currency: z.string().trim().length(3).default('LKR'),
  idempotencyKey: z.string().trim().min(8).max(120).optional()
})

export const listBillPaymentsSchema = z.object({
  accountId: z.coerce.number().int().positive().optional(),
  billerId: z.coerce.number().int().positive().optional(),
  status: z.enum(['pending', 'completed', 'failed', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
})

export const listBillersSchema = z.object({
  category: z.string().trim().min(1).max(40).optional(),
  search: z.string().trim().min(1).max(80).optional()
})

export type CreateBillPaymentInput = z.infer<typeof createBillPaymentSchema>
export type ListBillPaymentsInput = z.infer<typeof listBillPaymentsSchema>
export type ListBillersInput = z.infer<typeof listBillersSchema>

export { parseBody, parseParams }

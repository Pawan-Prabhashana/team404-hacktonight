/**
 * Invisible Savings validation schemas — Phase 9.
 *
 * All IDs are integer (SERIAL) to match the runtime DB schema.
 * userId is NEVER accepted from the body — it comes from the session.
 */
import { z } from 'zod'
import { parseBody, parseParams } from '@/server/schemas/banking-schemas'

export const simulatePartnerPurchaseSchema = z.object({
  partnerMerchantId: z.coerce.number().int().positive({
    message: 'A partner merchant is required.'
  }),
  sourceAccountId: z.coerce.number().int().positive({
    message: 'A source account is required.'
  }),
  purchaseAmount: z
    .union([z.string(), z.number()])
    .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, {
      message: 'Purchase amount must be a positive number.'
    }),
  currency: z.string().trim().length(3).default('LKR'),
  description: z.string().trim().max(140).optional(),
  idempotencyKey: z.string().trim().min(8).max(120).optional()
})

export const updateInvisibleSavingsSettingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    sourceAccountId: z.coerce.number().int().positive().optional(),
    destinationAccountId: z.coerce.number().int().positive().optional(),
    minRoundupAmount: z
      .union([z.string(), z.number()])
      .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0)
      .optional(),
    maxRoundupAmount: z
      .union([z.string(), z.number()])
      .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0)
      .optional(),
    sweepDay: z.coerce.number().int().min(1).max(28).optional()
  })
  .refine(
    (d) => {
      if (
        d.sourceAccountId !== undefined &&
        d.destinationAccountId !== undefined
      ) {
        return d.sourceAccountId !== d.destinationAccountId
      }
      return true
    },
    { message: 'Source and destination accounts must differ.' }
  )

export const sweepSavingsSchema = z.object({
  monthKey: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, 'Month key must be YYYY-MM format.')
    .optional()
})

export type SimulatePartnerPurchaseInput = z.infer<
  typeof simulatePartnerPurchaseSchema
>
export type UpdateInvisibleSavingsSettingsInput = z.infer<
  typeof updateInvisibleSavingsSettingsSchema
>

export { parseBody, parseParams }

/**
 * Transfer validation schemas — Phase 6.
 *
 * Uses integer account/beneficiary IDs to match the legacy DB schema.
 * Amount is accepted as string or number, converted to minor units in the service.
 */
import { z } from 'zod'
import { parseBody } from '@/server/schemas/banking-schemas'

export const createTransferSchema = z
  .object({
    sourceAccountId: z.coerce.number().int().positive({
      message: 'Source account is required.'
    }),
    destinationAccountId: z.coerce
      .number()
      .int()
      .positive()
      .nullable()
      .optional(),
    beneficiaryId: z.coerce.number().int().positive().nullable().optional(),
    amount: z
      .union([z.string(), z.number()])
      .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, {
        message: 'Amount must be a positive number.'
      }),
    currency: z.string().trim().length(3).default('LKR'),
    description: z.string().trim().max(140).optional().default(''),
    idempotencyKey: z.string().trim().min(8).max(120).optional()
  })
  .refine(
    (d) =>
      (d.destinationAccountId != null && d.destinationAccountId > 0) ||
      (d.beneficiaryId != null && d.beneficiaryId > 0),
    { message: 'A destination account or beneficiary is required.' }
  )

export type CreateTransferInput = z.infer<typeof createTransferSchema>

export { parseBody }

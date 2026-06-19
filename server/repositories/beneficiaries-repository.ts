/**
 * Beneficiaries repository — all queries scoped to the authenticated user.
 * Never exposes the full account number; masks it in responses.
 */
import { query } from '@/lib/db'
import { maskAccountNumber } from '@/lib/masking'
import { ensureDatabase } from '@/lib/platform-db'

type BeneficiaryRow = {
  id: number
  user_id: number
  name: string
  bank_name: string
  account_number: string
  trust_level: string
  created_at: string
  updated_at: string
}

export type SafeBeneficiary = {
  id: number
  name: string
  bankName: string
  accountNumberMasked: string
  trustLevel: string
  createdAt: string
  updatedAt: string
}

function toSafeBeneficiary(row: BeneficiaryRow): SafeBeneficiary {
  return {
    id: row.id,
    name: row.name,
    bankName: row.bank_name,
    accountNumberMasked: maskAccountNumber(row.account_number),
    trustLevel: row.trust_level,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function listBeneficiariesForUser(
  userId: number
): Promise<SafeBeneficiary[]> {
  await ensureDatabase()
  const result = await query<BeneficiaryRow>(
    `SELECT id, user_id, name, bank_name, account_number, trust_level, created_at, updated_at
     FROM beneficiaries
     WHERE user_id = $1
     ORDER BY name`,
    [userId]
  )
  return result.rows.map(toSafeBeneficiary)
}

export async function createBeneficiaryForUser(input: {
  userId: number
  name: string
  bankName: string
  accountNumber: string
}): Promise<SafeBeneficiary> {
  await ensureDatabase()
  const result = await query<BeneficiaryRow>(
    `INSERT INTO beneficiaries (user_id, name, bank_name, account_number, trust_level)
     VALUES ($1, $2, $3, $4, 'new')
     RETURNING id, user_id, name, bank_name, account_number, trust_level, created_at, updated_at`,
    [input.userId, input.name, input.bankName, input.accountNumber]
  )
  return toSafeBeneficiary(result.rows[0])
}

export async function updateBeneficiaryTrustLevel(input: {
  userId: number
  beneficiaryId: number
  trustLevel: 'new' | 'verified' | 'trusted' | 'blocked'
}): Promise<SafeBeneficiary | null> {
  await ensureDatabase()
  const result = await query<BeneficiaryRow>(
    `UPDATE beneficiaries
     SET trust_level = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3
     RETURNING id, user_id, name, bank_name, account_number, trust_level, created_at, updated_at`,
    [input.trustLevel, input.beneficiaryId, input.userId]
  )
  const row = result.rows[0]
  return row ? toSafeBeneficiary(row) : null
}

export async function deleteBeneficiaryForUser(
  userId: number,
  beneficiaryId: number
): Promise<boolean> {
  await ensureDatabase()
  const result = await query(
    'DELETE FROM beneficiaries WHERE id = $1 AND user_id = $2',
    [beneficiaryId, userId]
  )
  return (result.rowCount ?? 0) > 0
}

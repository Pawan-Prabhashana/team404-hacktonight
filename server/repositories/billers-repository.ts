/**
 * Billers repository — Phase 7.
 *
 * Returns only active billers and only safe, non-secret fields.
 * All search input is passed as bound parameters ($1, $2, …) — never
 * interpolated into the SQL string.
 */
import { query } from '@/lib/db'
import { ensureDatabase } from '@/lib/platform-db'

type BillerRow = {
  id: number
  name: string
  category: string
  provider_code: string
  logo_url: string | null
  status: string
}

export type SafeBiller = {
  id: number
  name: string
  category: string
  providerCode: string
  logoUrl: string | null
  status: string
}

function toSafeBiller(row: BillerRow): SafeBiller {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    providerCode: row.provider_code,
    logoUrl: row.logo_url,
    status: row.status
  }
}

/** List active billers, optionally filtered by category and/or search term. */
export async function listActiveBillers(input?: {
  category?: string
  search?: string
}): Promise<SafeBiller[]> {
  await ensureDatabase()

  const clauses: string[] = ["status = 'active'"]
  const params: unknown[] = []

  if (input?.category) {
    params.push(input.category)
    clauses.push(`category = $${params.length}`)
  }

  if (input?.search) {
    params.push(`%${input.search}%`)
    clauses.push(
      `(name ILIKE $${params.length} OR provider_code ILIKE $${params.length})`
    )
  }

  const result = await query<BillerRow>(
    `SELECT id, name, category, provider_code, logo_url, status
     FROM billers
     WHERE ${clauses.join(' AND ')}
     ORDER BY name ASC`,
    params
  )

  return result.rows.map(toSafeBiller)
}

/** Fetch a single active biller by integer ID, or null if not found/inactive. */
export async function getActiveBillerById(
  billerId: number
): Promise<SafeBiller | null> {
  await ensureDatabase()
  const result = await query<BillerRow>(
    `SELECT id, name, category, provider_code, logo_url, status
     FROM billers
     WHERE id = $1 AND status = 'active'
     LIMIT 1`,
    [billerId]
  )
  const row = result.rows[0]
  return row ? toSafeBiller(row) : null
}

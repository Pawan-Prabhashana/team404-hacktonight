/**
 * Partner merchants repository — Phase 9.
 *
 * Returns only active merchants and only safe fields.
 */
import { query } from '@/lib/db'
import { ensureDatabase } from '@/lib/platform-db'

type PartnerMerchantRow = {
  id: number
  name: string
  slug: string
  category: string
  logo_url: string | null
  status: string
  min_roundup_minor_units: string
  max_roundup_minor_units: string
}

export type SafePartnerMerchant = {
  id: number
  name: string
  slug: string
  category: string
  logoUrl: string | null
  status: string
  minRoundupMinorUnits: number
  maxRoundupMinorUnits: number
}

function toSafe(row: PartnerMerchantRow): SafePartnerMerchant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    logoUrl: row.logo_url,
    status: row.status,
    minRoundupMinorUnits: Number(row.min_roundup_minor_units),
    maxRoundupMinorUnits: Number(row.max_roundup_minor_units)
  }
}

export async function listActivePartnerMerchants(): Promise<
  SafePartnerMerchant[]
> {
  await ensureDatabase()
  const r = await query<PartnerMerchantRow>(
    `SELECT id, name, slug, category, logo_url, status,
            min_roundup_minor_units, max_roundup_minor_units
     FROM partner_merchants
     WHERE status = 'active'
     ORDER BY name ASC`
  )
  return r.rows.map(toSafe)
}

export async function getActivePartnerMerchantById(
  id: number
): Promise<SafePartnerMerchant | null> {
  await ensureDatabase()
  const r = await query<PartnerMerchantRow>(
    `SELECT id, name, slug, category, logo_url, status,
            min_roundup_minor_units, max_roundup_minor_units
     FROM partner_merchants
     WHERE id = $1 AND status = 'active'
     LIMIT 1`,
    [id]
  )
  return r.rows[0] ? toSafe(r.rows[0]) : null
}

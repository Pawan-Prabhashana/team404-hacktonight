/**
 * Money utilities for NOVA Bank.
 *
 * All monetary values in the new schema are stored as integer minor units
 * to avoid floating-point precision issues.
 *
 *   Rs. 100.50  →  10050 minor units   (LKR uses 2 decimal places)
 *   Rs.   1,000 → 100000 minor units
 *
 * Usage:
 *   toMinorUnits('100.50')        // → 10050
 *   fromMinorUnits(10050)         // → '100.50'
 *   formatCurrency(10050)         // → 'LKR 100.50'
 *   assertPositiveAmount(10050)   // → void (throws if invalid)
 */

const MINOR_UNIT_SCALE = 100 // LKR and most currencies use 2 decimal places

/**
 * Convert a human-readable amount string or number to integer minor units.
 * Throws if the value is not a valid positive number.
 *
 * @example
 *   toMinorUnits('100.50') // → 10050
 *   toMinorUnits(1000)     // → 100000
 */
export function toMinorUnits(amount: string | number): number {
  const n = typeof amount === 'string' ? Number.parseFloat(amount) : amount
  if (!Number.isFinite(n)) {
    throw new RangeError(`Invalid amount: "${amount}" is not a finite number.`)
  }
  if (n < 0) {
    throw new RangeError(`Invalid amount: "${amount}" must not be negative.`)
  }
  // Round to avoid floating-point drift (e.g. 0.1 + 0.2 = 0.30000000000000004)
  return Math.round(n * MINOR_UNIT_SCALE)
}

/**
 * Convert integer minor units back to a decimal string.
 *
 * @example
 *   fromMinorUnits(10050) // → '100.50'
 */
export function fromMinorUnits(amountMinorUnits: number): string {
  if (!Number.isInteger(amountMinorUnits)) {
    throw new TypeError(
      `fromMinorUnits expects an integer, got ${amountMinorUnits}.`
    )
  }
  return (amountMinorUnits / MINOR_UNIT_SCALE).toFixed(2)
}

/**
 * Assert that an amount in minor units is a positive integer.
 * Throws a RangeError if not.
 */
export function assertPositiveAmount(amountMinorUnits: number): void {
  if (!Number.isInteger(amountMinorUnits)) {
    throw new RangeError(
      `Amount must be an integer (minor units), got ${amountMinorUnits}.`
    )
  }
  if (amountMinorUnits <= 0) {
    throw new RangeError(
      `Amount must be greater than zero, got ${amountMinorUnits}.`
    )
  }
}

/**
 * Format minor units as a human-readable currency string.
 *
 * @example
 *   formatCurrency(10050)        // → 'LKR 100.50'
 *   formatCurrency(10050, 'USD') // → 'USD 100.50'
 */
export function formatCurrency(
  amountMinorUnits: number,
  currency = 'LKR'
): string {
  const decimal = fromMinorUnits(amountMinorUnits)
  // Format with thousands separator
  const [whole, cents] = decimal.split('.')
  const formatted = Number(whole).toLocaleString('en-US')
  return `${currency} ${formatted}.${cents}`
}

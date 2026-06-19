/**
 * Masking utilities for NOVA Bank.
 *
 * Used to hide sensitive data (account numbers, card numbers) in API responses
 * and client-facing UI without exposing the full value.
 */

/**
 * Mask an account number, showing only the last 4 digits.
 * e.g. '1000003423' → '•••• •••• 3423'
 */
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber) return ''
  const visible = accountNumber.slice(-4)
  return `•••• •••• ${visible}`
}

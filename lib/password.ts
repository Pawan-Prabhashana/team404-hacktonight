/**
 * Password hashing utilities for NOVA Bank.
 *
 * Rules:
 *   - Passwords are always hashed with bcrypt (12 rounds) before storage.
 *   - Plaintext passwords are never logged or returned to clients.
 *   - Comparison is done with bcrypt.compare (constant-time).
 */
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}

/**
 * Returns a human-readable error string if the password is too weak,
 * or null if it meets minimum requirements.
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(password))
    return 'Password must contain at least one uppercase letter.'
  if (!/[a-z]/.test(password))
    return 'Password must contain at least one lowercase letter.'
  if (!/[0-9]/.test(password))
    return 'Password must contain at least one number.'
  return null
}

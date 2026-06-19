/**
 * Password generator utilities for Serandib Bank sign-up.
 * Runs fully client-side — never sends a password to the server.
 */

const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghjkmnpqrstuvwxyz'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%^&*-_=+'

/** Generate a cryptographically random strong password. */
export function generateStrongPassword(length = 18): string {
  const pool = UPPERCASE + LOWERCASE + DIGITS + SYMBOLS
  // Ensure at least one of each required type
  const required = [
    UPPERCASE[rand(UPPERCASE.length)],
    LOWERCASE[rand(LOWERCASE.length)],
    DIGITS[rand(DIGITS.length)],
    SYMBOLS[rand(SYMBOLS.length)]
  ]
  const rest = Array.from(
    { length: length - required.length },
    () => pool[rand(pool.length)]
  )
  return shuffle([...required, ...rest]).join('')
}

function rand(max: number): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(1)
    crypto.getRandomValues(arr)
    return arr[0] % max
  }
  return Math.floor(Math.random() * max)
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand(i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export type PasswordScore = {
  score: number
  label: 'Weak' | 'Medium' | 'Strong'
  checks: {
    length: boolean
    uppercase: boolean
    lowercase: boolean
    number: boolean
    symbol: boolean
  }
}

/** Score a password on a 0-100 scale and return checklist. */
export function scorePassword(password: string): PasswordScore {
  const checks = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password)
  }

  const passedCount = Object.values(checks).filter(Boolean).length
  let score = passedCount * 20
  if (password.length >= 16) score = Math.min(100, score + 10)
  if (password.length >= 20) score = Math.min(100, score + 10)

  const label: PasswordScore['label'] =
    score >= 80 ? 'Strong' : score >= 50 ? 'Medium' : 'Weak'

  return { score, label, checks }
}

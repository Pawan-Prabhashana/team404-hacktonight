'use client'

import { scorePassword } from '@/lib/password-generator'

type PasswordStrengthMeterProps = {
  password: string
  showChecks?: boolean
}

export function PasswordStrengthMeter({
  password,
  showChecks = true
}: PasswordStrengthMeterProps) {
  if (!password) return null

  const { score, label, checks } = scorePassword(password)
  const color =
    label === 'Strong' ? '#10b981' : label === 'Medium' ? '#f59e0b' : '#ef4444'

  return (
    <div className="mt-2">
      <div
        className="h-1.5 w-full rounded-full overflow-hidden"
        style={{ background: 'rgba(10,99,255,0.08)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <p className="mt-1 text-xs font-medium" style={{ color }}>
        {label}
      </p>
      {showChecks && (
        <div className="mt-2 grid grid-cols-3 gap-1">
          {[
            { ok: checks.length, label: '12+ chars' },
            { ok: checks.uppercase, label: 'Uppercase' },
            { ok: checks.lowercase, label: 'Lowercase' },
            { ok: checks.number, label: 'Number' },
            { ok: checks.symbol, label: 'Symbol' }
          ].map((c) => (
            <div key={c.label} className="flex items-center gap-1">
              <span
                className={`text-xs ${c.ok ? 'text-green-500' : 'text-gray-300'}`}
              >
                {c.ok ? '✓' : '○'}
              </span>
              <span
                className={`text-xs ${c.ok ? 'text-gray-600' : 'text-gray-400'}`}
              >
                {c.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import type { ReactNode } from 'react'

type SerandibButtonProps = {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
  className?: string
  href?: string
}

export function SerandibButton({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  onClick,
  type = 'button',
  className = '',
  href
}: SerandibButtonProps) {
  const sizeClass =
    size === 'sm'
      ? 'py-1.5 px-4 text-xs'
      : size === 'lg'
        ? 'py-4 px-8 text-base'
        : 'py-2.5 px-6 text-sm'
  const variantClass = `serandib-button-${variant}`
  const cls = `${variantClass} ${sizeClass} ${className} ${disabled || loading ? 'opacity-60 cursor-not-allowed' : ''}`

  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    )
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={cls}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83" />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  )
}

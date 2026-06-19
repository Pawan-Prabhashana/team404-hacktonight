type PageSectionProps = {
  title?: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

export default function PageSection({
  title,
  subtitle,
  children,
  className = ''
}: PageSectionProps) {
  return (
    <section className={`mb-8 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          )}
          {subtitle && (
            <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </section>
  )
}

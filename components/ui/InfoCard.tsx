type InfoCardProps = {
  title: string
  value?: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export default function InfoCard({
  title,
  value,
  description,
  children,
  className = ''
}: InfoCardProps) {
  return (
    <div
      className={`rounded-2xl bg-white px-6 py-5 shadow-[0_4px_16px_rgba(0,0,0,0.07)] ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        {title}
      </p>
      {value && (
        <p className="mt-2 text-3xl font-extrabold text-gray-900">{value}</p>
      )}
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
      {children}
    </div>
  )
}

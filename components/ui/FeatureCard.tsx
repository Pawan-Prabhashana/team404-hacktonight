interface FeatureCardProps {
  icon: string
  title: string
  description: string
  delay?: number
}

export default function FeatureCard({
  icon,
  title,
  description,
  delay = 0
}: FeatureCardProps) {
  return (
    <div
      className="serandib-feature-card fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div style={{ fontSize: '2.25rem', lineHeight: 1 }}>{icon}</div>
      <h3
        style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--sb-text)',
          lineHeight: 1.3
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: '0.9375rem',
          color: 'var(--sb-muted)',
          lineHeight: 1.65
        }}
      >
        {description}
      </p>
    </div>
  )
}

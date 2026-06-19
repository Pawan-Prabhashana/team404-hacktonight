type AnimatedBackgroundProps = {
  children: React.ReactNode
  className?: string
}

export function AnimatedBackground({
  children,
  className = ''
}: AnimatedBackgroundProps) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background:
          'linear-gradient(160deg, #03144d 0%, #061a40 40%, #091c4e 100%)'
      }}
    >
      <div
        className="absolute"
        style={{
          top: '-20%',
          left: '-10%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(10,99,255,0.18) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: '-10%',
          right: '-5%',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none'
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

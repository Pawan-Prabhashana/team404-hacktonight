type LoadingStateProps = { className?: string }

export default function LoadingState({ className = '' }: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className="app-spinner" />
    </div>
  )
}

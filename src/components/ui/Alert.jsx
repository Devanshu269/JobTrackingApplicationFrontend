const variants = {
  error: 'border-danger/40 bg-danger/10 text-primary-hover',
  success: 'border-success/40 bg-success/10 text-accent-hover',
  info: 'border-accent/40 bg-accent/10 text-accent-hover',
}

export function Alert({ variant = 'info', children }) {
  if (!children) return null
  return (
    <div className={`rounded-md border px-3 py-2.5 text-sm ${variants[variant]}`}>
      {children}
    </div>
  )
}

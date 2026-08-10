/* eslint-disable react-refresh/only-export-components */
const variants = {
  // bg-brand is the iridescent gradient; brightness is how you 'hover' a gradient.
  primary:
    'bg-brand text-on-primary hover:-translate-y-0.5 hover:brightness-110 active:brightness-95 hover:shadow-lg hover:shadow-primary/30',
  ghost:
    'bg-surface-alt text-text border border-border hover:border-text-muted/50 hover:bg-surface-alt/70 hover:-translate-y-0.5',
}

const base =
  'flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 font-medium transition-all duration-300 cursor-pointer active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none'

export function buttonClasses(variant = 'primary', className = '') {
  return `${base} ${variants[variant]} ${className}`
}

export function Button({
  variant = 'primary',
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={buttonClasses(variant, className)}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
      )}
      {children}
    </button>
  )
}

/** Anchor styled as a button — for real navigations (OAuth2 handoffs, external links). */
export function ButtonLink({ variant = 'ghost', className = '', children, ...props }) {
  return (
    <a className={buttonClasses(variant, className)} {...props}>
      {children}
    </a>
  )
}

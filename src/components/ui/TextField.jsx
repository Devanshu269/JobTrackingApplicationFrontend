function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 text-accent" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" opacity="0.45" />
      <path
        d="M5 8.3l2.1 2.1L11 6.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 text-danger" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" opacity="0.45" />
      <path d="M8 4.6v4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="8" cy="11.4" r="0.9" fill="currentColor" />
    </svg>
  )
}

/** status: 'valid' | 'invalid' | undefined — drives the border and the icon. */
export function TextField({
  label,
  labelAccessory,
  id,
  trailing,
  status,
  hint,
  className = '',
  ...props
}) {
  const ring =
    status === 'valid'
      ? 'border-accent/70 focus:border-accent focus:ring-accent/25'
      : status === 'invalid'
        ? 'border-danger/70 focus:border-danger focus:ring-danger/25'
        : 'border-border focus:border-primary focus:ring-primary/25'

  const icon =
    status === 'valid' ? <CheckIcon /> : status === 'invalid' ? <AlertIcon /> : null

  return (
    <div className="flex flex-col gap-1 text-left">
      {label && (
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={id} className="text-xs font-medium text-text-muted wide:text-sm">
            {label}
          </label>
          {labelAccessory}
        </div>
      )}
      <div className="relative">
        <input
          id={id}
          aria-invalid={status === 'invalid' ? 'true' : undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`w-full rounded-lg border bg-surface-alt/70 px-3.5 py-2 text-[15px] text-text transition-all duration-300 placeholder:text-text-muted/50 hover:border-text-muted/40 focus:outline-none focus:ring-2 wide:py-2.5 wide:text-base ultra:py-3 ultra:text-lg ${ring} ${
            trailing || icon ? 'pr-10' : ''
          } ${className}`}
          {...props}
        />
        <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          {trailing}
          {!trailing && icon && <span className="pr-2">{icon}</span>}
        </div>
      </div>
      {hint && (
        <p
          id={`${id}-hint`}
          className={`text-[11px] ${status === 'invalid' ? 'text-danger' : 'text-text-muted'}`}
        >
          {hint}
        </p>
      )}
    </div>
  )
}

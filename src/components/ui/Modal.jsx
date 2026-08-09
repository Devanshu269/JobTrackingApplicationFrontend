import { useEffect } from 'react'

/** Centred dialog with a scrim. Escape closes; body scroll is locked while open. */
export function Modal({ open, onClose, title, subtitle, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const widths = { md: 'max-w-lg', lg: 'max-w-3xl' }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative my-4 w-full ${widths[size]} animate-fade-in-up rounded-xl border border-border/60 bg-surface shadow-2xl shadow-black/50`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/40 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-text">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

const controlClasses =
  'w-full rounded-lg border border-border/60 bg-surface-alt/50 px-3 py-2 text-sm text-text placeholder:text-text-muted/50 transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/25'

/** Label + control + error wrapper, shared by every form field in the app. */
export function Field({ label, htmlFor, error, hint, required, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 text-left ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="text-xs font-medium text-text-muted">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[11px] text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-text-muted/70">{hint}</p>
      ) : null}
    </div>
  )
}

export function Input({ error, className = '', ...props }) {
  return (
    <input
      className={`${controlClasses} ${error ? 'border-danger/70' : ''} ${className}`}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    />
  )
}

export function Select({ error, className = '', children, ...props }) {
  return (
    <select
      className={`${controlClasses} cursor-pointer ${error ? 'border-danger/70' : ''} ${className}`}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    >
      {children}
    </select>
  )
}

export function Textarea({ error, className = '', ...props }) {
  return (
    <textarea
      className={`${controlClasses} resize-y ${error ? 'border-danger/70' : ''} ${className}`}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    />
  )
}

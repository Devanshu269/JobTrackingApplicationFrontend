/**
 * Compact form controls for the signed-in app — Settings, the job and round modals.
 *
 * There is a second input in this folder and the split is deliberate: [TextField](./TextField.jsx)
 * is the **auth-page** input. It is physically larger (`wide:`/`ultra:` steps), carries a
 * valid/invalid `status` with an icon rather than a plain `error` string, and takes `trailing`
 * and `labelAccessory` slots for the password reveal and the "forgot password?" link. It also
 * feeds the aperture lens, which reads the same status.
 *
 * Rule of thumb: **auth pages use `TextField`, everything behind the login uses `Field` +
 * `Input`.** Don't reach for one in the other's context — the sizes are tuned to two different
 * layouts, and the login page has a hard no-scroll constraint at every breakpoint.
 */
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

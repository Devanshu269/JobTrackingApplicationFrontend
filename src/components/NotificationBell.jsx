import { useState } from 'react'

/**
 * Top-bar notification bell.
 *
 * The dot is driven by real state — it used to be hardcoded on, which meant it never carried
 * any information. If there is nothing to report, there is no dot and the panel says so.
 *
 * Notifications are passed in rather than fetched here, so the shell stays free of data
 * loading and each source can decide what it knows. Today the only source is "no default
 * resume set"; follow-up reminders and upcoming interviews slot in as extra entries once
 * their backends exist.
 *
 * @param {Array<{id, title, body, actionLabel, onAction, tone}>} props.notifications
 */
export function NotificationBell({ notifications = [] }) {
  const [open, setOpen] = useState(false)
  const count = notifications.length

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-text-muted transition-colors duration-200 hover:bg-surface-alt hover:text-text"
        aria-label={count > 0 ? `Notifications (${count})` : 'Notifications'}
        aria-expanded={open}
      >
        <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 2a5 5 0 00-5 5v3l-1.5 2.5h13L14 10V7a5 5 0 00-5-5zM7 15a2 2 0 004 0" />
        </svg>
        {count > 0 && (
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-bg"
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 animate-fade-in-down rounded-xl border border-border/60 bg-surface/95 p-2 shadow-xl shadow-black/40 backdrop-blur-xl">
            <div className="border-b border-border/40 px-3 pb-2 pt-1.5">
              <p className="text-xs font-semibold text-text">Notifications</p>
            </div>

            {count === 0 ? (
              <p className="px-3 py-6 text-center text-[11px] text-text-muted/70">
                You&apos;re all caught up.
              </p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        n.onAction?.()
                      }}
                      className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors duration-200 hover:bg-surface-alt/60"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: n.tone === 'warning' ? '#fbbf24' : '#7c6bf5' }}
                          aria-hidden="true"
                        />
                        <span className="text-sm font-medium text-text">{n.title}</span>
                      </span>
                      <span className="pl-3.5 text-[11px] leading-snug text-text-muted">
                        {n.body}
                      </span>
                      {n.actionLabel && (
                        <span className="pl-3.5 text-[11px] font-medium text-primary">
                          {n.actionLabel} →
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}

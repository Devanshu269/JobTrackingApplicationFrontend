import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Centred dialog with a scrim. Escape closes; body scroll is locked while open.
 *
 * Rendered through a portal into `<body>`. Call sites sit inside AppShell's `<main>`, which
 * scrolls under a `sticky z-30` top bar — left in place, the dialog is stuck in that subtree
 * and the top bar paints over its title. The portal puts it in the root stacking context
 * where `z-[60]` actually means what it says.
 *
 * The panel is capped at the viewport height and scrolls its *body* only, so the title bar
 * and the `footer` actions stay pinned however long the content gets. A form must never be
 * able to push its own Save button below the fold.
 *
 * `footer` renders outside the scroll area, which puts it outside any `<form>` passed as
 * children — submit buttons in there need `form="<the form's id>"` to stay wired up.
 *
 * Focus moves into the panel on open, cycles inside it on Tab, and returns to whatever
 * opened the dialog on close.
 */
export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  const titleId = useId()
  const panelRef = useRef(null)
  const bodyRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const previouslyFocused = document.activeElement

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      // Tab must not escape the dialog — everything behind it is inert to the mouse
      // (the scrim) but would otherwise still be reachable by keyboard.
      const focusable = [...(panelRef.current?.querySelectorAll(FOCUSABLE) ?? [])].filter(
        (el) => el.offsetParent !== null,
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Prefer the first field in the body over the close button, which is earlier in the DOM.
    const target = bodyRef.current?.querySelector(FOCUSABLE) ?? panelRef.current
    target?.focus({ preventScroll: true })

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus({ preventScroll: true })
    }
  }, [open, onClose])

  if (!open) return null

  const widths = { md: 'max-w-lg', lg: 'max-w-3xl' }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[calc(100dvh-2rem)] w-full ${widths[size]} animate-fade-in-up flex-col rounded-xl border border-border/60 bg-surface shadow-2xl shadow-black/50 sm:max-h-[calc(100dvh-3rem)]`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border/40 px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-text">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 truncate text-xs text-text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 cursor-pointer rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        <div ref={bodyRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-border/40 bg-surface px-5 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}


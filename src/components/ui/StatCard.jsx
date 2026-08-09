import { useEffect, useRef, useState } from 'react'

/**
 * Glassmorphic stat card with animated count-up and accent colour.
 * @param {object} props
 * @param {string} props.label — e.g. "Total Applications"
 * @param {number} props.value — the number to display
 * @param {React.ReactNode} props.icon — an SVG or emoji
 * @param {string} props.accentColor — hex colour for the accent dot/glow
 * @param {string} [props.className]
 */
export function StatCard({ label, value, icon, accentColor = '#7c6bf5', className = '' }) {
  const [displayed, setDisplayed] = useState(0)
  const ref = useRef(null)
  const counted = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true
          // Animate from 0 to value over ~600ms
          const duration = 600
          const start = performance.now()
          function tick(now) {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            // ease-out
            const eased = 1 - Math.pow(1 - progress, 3)
            setDisplayed(Math.round(eased * value))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  return (
    <div
      ref={ref}
      className={`glass-card group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${className}`}
      style={{
        '--glow-color': `${accentColor}30`,
      }}
    >
      {/* Subtle gradient glow in top-right */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-60"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-text-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-text">{displayed}</p>
        </div>
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
          style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
        >
          {icon}
        </span>
      </div>
    </div>
  )
}

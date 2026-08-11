import { useId } from 'react'

const BLADES = 6
const TICKS = 24

/**
 * Blade inner-edge distance from centre, per state.
 *
 * `closed` deliberately stops at 7 rather than 0. At 0 every blade's leading
 * edge runs through the centre, so the six edges collapse into three full
 * diameters whose strokes overpaint each other — it reads as a missing blade.
 * Stopping short leaves a small hexagon with six clean seams; the hub below
 * caps the remaining hole.
 */
const APOTHEM = { idle: 52, active: 52, valid: 52, invalid: 52, ajar: 28, closed: 7 }

const SEAM = '#5a5a8c'
/** Circumradius of a hexagon whose apothem is 1. */
const HEX_R = 1 / Math.cos(Math.PI / 6)
/** Unit hexagon with edge midpoints on the axes, matching the blade directions. */
const HEX_POINTS = Array.from({ length: BLADES }, (_, i) => {
  const th = ((i * 60 + 30) * Math.PI) / 180
  return `${(HEX_R * Math.cos(th)).toFixed(4)},${(HEX_R * Math.sin(th)).toFixed(4)}`
}).join(' ')

/**
 * Reactive aperture for the auth form.
 *
 * Built from few, thick, high-contrast shapes: this renders at 72px on a
 * laptop, where hairlines and fine detail turn to mush.
 *
 * state:
 *  - 'idle'     iris open, pupil tracks the pointer
 *  - 'active'   a field has focus; the tick ring fills as you type
 *  - 'valid'    input passes validation — pupil and rim go green
 *  - 'invalid'  input is malformed — pupil and rim go red
 *  - 'closed'   password focused — blades slam shut
 *  - 'ajar'     password revealed — blades reopen partway
 */
export function ApertureLens({
  lookX = 0,
  lookY = 0,
  state = 'idle',
  progress = 0,
  className = '',
}) {
  const uid = useId().replace(/:/g, '')
  const clamp = (n) => Math.max(-1, Math.min(1, n))

  const apothem = APOTHEM[state] ?? APOTHEM.idle
  const shut = state === 'closed'
  const ajar = state === 'ajar'
  const valid = state === 'valid'
  const invalid = state === 'invalid'
  const active = state === 'active' || valid || invalid
  const sealed = shut || ajar

  // Real irises twist as they stop down. Bigger sweep = more visible motion.
  const twist = (1 - apothem / APOTHEM.idle) * 26
  const pupilX = clamp(lookX) * 9
  const pupilY = clamp(lookY) * 7
  const lit = Math.round(clamp(progress) * TICKS)

  // Slightly overshooting spring — a linear slide reads as nothing happening.
  const bladeEase = 'cubic-bezier(0.34, 1.35, 0.64, 1)'
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)'

  const signal = valid
    ? 'var(--color-success)'
    : invalid
      ? 'var(--color-danger)'
      : `url(#ring-${uid})`

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      /* Decorative: mirrors form state a sighted user already perceives. */
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={`bore-${uid}`}>
          <circle cx="100" cy="100" r="78" />
        </clipPath>
        <linearGradient id={`ring-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--brand-from)" />
          <stop offset="50%" stopColor="var(--brand-mid)" />
          <stop offset="100%" stopColor="var(--brand-to)" />
        </linearGradient>
        {/* Blades are deliberately much lighter than the well behind them —
            near-equal values were why the closing motion was invisible. */}
        <linearGradient id={`blade-${uid}`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#3b3b63" />
          <stop offset="55%" stopColor="#2a2a47" />
          <stop offset="100%" stopColor="#1e1e33" />
        </linearGradient>
        <radialGradient id={`well-${uid}`} cx="50%" cy="42%" r="70%">
          <stop offset="0%" stopColor="#141428" />
          <stop offset="100%" stopColor="#06060c" />
        </radialGradient>
      </defs>

      {/* NOTE: do not key this group on state. A key remounts the subtree, which
          makes the blades render straight at their final position with nothing
          to transition from — the close animation silently stops playing. */}
      <g>
        {/* bezel */}
        <circle cx="100" cy="100" r="94" className="fill-surface" />
        <circle cx="100" cy="100" r="94" fill="none" strokeWidth="3" className="stroke-border" />

        {/* tick ring — fills as the focused field fills */}
        {Array.from({ length: TICKS }, (_, i) => {
          const on = active && i < lit
          return (
            <rect
              key={i}
              x="98.4"
              y="9"
              width="3.2"
              height={on ? 9 : 5}
              rx="1.6"
              transform={`rotate(${(i * 360) / TICKS} 100 100)`}
              fill={on ? signal : 'var(--color-border)'}
              style={{ transition: `fill 200ms ease, height 200ms ${ease}` }}
            />
          )
        })}

        <g clipPath={`url(#bore-${uid})`}>
          <circle cx="100" cy="100" r="78" fill={`url(#well-${uid})`} />

          {/* Pupil. NOT hidden when shut — the blades physically occlude it,
              which is the entire point of the animation. */}
          <g
            style={{
              transform: `translate(${pupilX}px, ${pupilY}px)`,
              transition: `transform 260ms ${ease}`,
            }}
          >
            <circle cx="100" cy="100" r="34" fill={signal} />
            <circle cx="100" cy="100" r="16" fill="#06060c" opacity="0.9" />
            {/* Sits on the gradient ring, not the dark core — inside the core
                it just reads as a grey blob rather than a specular highlight. */}
            <circle cx="84" cy="84" r="5" fill="#ffffff" opacity="0.5" />
          </g>

          {/* Iris blades — six half-planes whose union leaves a hexagonal bore.
              Fills only: the seams are drawn separately below. Stroking the
              blade outlines meant later blades painted over earlier ones, and
              one seam always ended up fully hidden ("missing blade"). */}
          <g
            style={{
              transform: `rotate(${twist}deg)`,
              transformOrigin: '100px 100px',
              transformBox: 'view-box',
              transition: `transform 520ms ${bladeEase}`,
            }}
          >
            {Array.from({ length: BLADES }, (_, i) => (
              <g key={i} transform={`rotate(${(i * 360) / BLADES} 100 100)`}>
                <path
                  d="M100 -50 L260 -50 L260 250 L100 250 Z"
                  fill={`url(#blade-${uid})`}
                  style={{
                    transform: `translateX(${apothem}px)`,
                    transition: `transform 520ms ${bladeEase}`,
                  }}
                />
              </g>
            ))}

            {/* Bore outline: a unit hexagon scaled by the apothem, so it still
                animates via CSS rather than jumping per render. */}
            <polygon
              points={HEX_POINTS}
              fill="none"
              stroke={SEAM}
              strokeWidth="2.2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{
                transform: `translate(100px, 100px) scale(${Math.max(apothem, 0.001)})`,
                transition: `transform 520ms ${bladeEase}`,
              }}
            />

            {/* One seam per blade, from each hexagon corner out to the rim.
                Explicit elements, so all six always render. */}
            {Array.from({ length: BLADES }, (_, i) => (
              <line
                key={`seam-${i}`}
                x1="0"
                y1="0"
                x2="95"
                y2="0"
                stroke={SEAM}
                strokeWidth="2.2"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{
                  transform: `translate(100px, 100px) rotate(${i * 60 + 30}deg) translateX(${
                    apothem * HEX_R
                  }px)`,
                  transition: `transform 520ms ${bladeEase}`,
                }}
              />
            ))}
          </g>

          {/* Hub — caps the small hexagonal gap the blades leave at centre, and
              gives the sealed state a deliberate focal point. */}
          <g
            style={{
              opacity: shut ? 1 : 0,
              transition: `opacity 240ms ${ease} ${shut ? '260ms' : '0ms'}`,
            }}
          >
            <circle
              cx="100"
              cy="100"
              r="14"
              fill={`url(#blade-${uid})`}
              stroke="#5a5a8c"
              strokeWidth="2.2"
            />
            <circle cx="100" cy="100" r="5.5" fill={signal} />
          </g>
        </g>

        {/* Shockwave on seal, keyed so it fires on each close */}
        {shut && (
          <circle
            key={`pulse-${state}`}
            cx="100"
            cy="100"
            r="78"
            fill="none"
            stroke={signal}
            strokeWidth="5"
            className="animate-lock-pulse"
            style={{ transformOrigin: '100px 100px', transformBox: 'view-box' }}
          />
        )}

        {/* Halo so a sealed lens still reads against a dark page */}
        <circle
          cx="100"
          cy="100"
          r="78"
          fill="none"
          stroke={signal}
          strokeWidth="9"
          opacity={sealed ? 0.22 : 0}
          style={{ transition: 'opacity 320ms ease' }}
        />

        {/* bore rim — thickest single element, so it survives being shrunk */}
        <circle
          cx="100"
          cy="100"
          r="78"
          fill="none"
          strokeWidth={sealed ? 5.5 : 4}
          stroke={signal}
          opacity={sealed ? 1 : 0.8}
          style={{ transition: `stroke 300ms ease, opacity 300ms ease, stroke-width 320ms ${ease}` }}
        />
      </g>
    </svg>
  )
}

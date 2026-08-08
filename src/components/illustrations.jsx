/**
 * Abstract product illustrations for the login showcase. Placeholder art —
 * swap for real screenshots once the dashboard exists.
 */

const frame = 'w-full max-w-[350px] wide:max-w-[440px] ultra:max-w-[520px]'

function Panel({ children }) {
  return (
    <svg viewBox="0 0 400 290" className={frame} role="img">
      <rect
        x="1"
        y="1"
        width="398"
        height="288"
        rx="16"
        className="fill-surface stroke-border"
        strokeWidth="1.5"
      />
      {/* window chrome */}
      <circle cx="26" cy="24" r="4.5" className="fill-primary/70" />
      <circle cx="42" cy="24" r="4.5" className="fill-warning/60" />
      <circle cx="58" cy="24" r="4.5" className="fill-accent/70" />
      <line x1="1" y1="44" x2="399" y2="44" className="stroke-border" strokeWidth="1.5" />
      {children}
    </svg>
  )
}

export function KanbanIllustration() {
  const columns = [
    { x: 22, label: 'primary', cards: [0, 1, 2] },
    { x: 148, label: 'accent', cards: [0, 1] },
    { x: 274, label: 'muted', cards: [0] },
  ]
  const headTone = {
    primary: 'fill-primary/70',
    accent: 'fill-accent/70',
    muted: 'fill-text-muted/40',
  }

  return (
    <Panel>
      {columns.map((col, ci) => (
        <g key={ci}>
          <rect
            x={col.x}
            y="62"
            width="104"
            height="6"
            rx="3"
            className={headTone[col.label]}
          />
          {col.cards.map((_, i) => (
            <g
              key={i}
              className="animate-fade-in-up"
              style={{ animationDelay: `${ci * 140 + i * 110}ms` }}
            >
              <rect
                x={col.x}
                y={84 + i * 56}
                width="104"
                height="44"
                rx="8"
                className="fill-surface-alt stroke-border"
                strokeWidth="1"
              />
              <rect
                x={col.x + 12}
                y={96 + i * 56}
                width="58"
                height="5"
                rx="2.5"
                className="fill-text/35"
              />
              <rect
                x={col.x + 12}
                y={108 + i * 56}
                width="38"
                height="5"
                rx="2.5"
                className="fill-text-muted/35"
              />
            </g>
          ))}
        </g>
      ))}
      {/* a card mid-drag between columns */}
      <g className="animate-float">
        <rect
          x="122"
          y="176"
          width="104"
          height="44"
          rx="8"
          className="fill-surface-alt stroke-primary"
          strokeWidth="1.5"
        />
        <rect x="134" y="188" width="58" height="5" rx="2.5" className="fill-primary/70" />
        <rect x="134" y="200" width="38" height="5" rx="2.5" className="fill-text-muted/45" />
      </g>
    </Panel>
  )
}

export function RemindersIllustration() {
  const days = Array.from({ length: 21 })

  return (
    <Panel>
      {days.map((_, i) => {
        const col = i % 7
        const row = Math.floor(i / 7)
        const isDue = i === 10
        return (
          <rect
            key={i}
            x={30 + col * 48}
            y={70 + row * 44}
            width="38"
            height="34"
            rx="6"
            strokeWidth="1"
            className={
              isDue
                ? 'fill-primary/25 stroke-primary'
                : 'fill-surface-alt stroke-border'
            }
          />
        )
      })}
      {/* bell badge over the due day */}
      <g className="animate-ring" style={{ transformOrigin: '340px 96px' }}>
        <circle cx="340" cy="96" r="26" className="fill-primary" />
        <path
          d="M340 84c-5 0-9 4-9 9v6l-3 4h24l-3-4v-6c0-5-4-9-9-9z"
          className="fill-on-primary"
        />
        <path d="M336 105a4 4 0 008 0z" className="fill-on-primary" />
      </g>
      <rect x="30" y="214" width="150" height="6" rx="3" className="fill-text/30" />
      <rect x="30" y="230" width="96" height="6" rx="3" className="fill-text-muted/30" />
    </Panel>
  )
}

export function AnalyticsIllustration() {
  const bars = [38, 62, 46, 88, 70, 112, 96]

  return (
    <Panel>
      <line x1="34" y1="222" x2="372" y2="222" className="stroke-border" strokeWidth="1.5" />
      {bars.map((h, i) => (
        <rect
          key={i}
          x={44 + i * 46}
          y={222 - h}
          width="26"
          height={h}
          rx="5"
          className={`origin-bottom animate-grow-bar ${
            i === 5 ? 'fill-primary' : 'fill-primary/30'
          }`}
          style={{ animationDelay: `${i * 90}ms`, transformOrigin: `0 222px` }}
        />
      ))}
      <path
        d="M57 184 L103 160 L149 172 L195 130 L241 148 L287 110 L333 126"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="320"
        className="animate-draw stroke-accent"
      />
      <circle cx="287" cy="110" r="5" className="fill-accent" />
      <rect x="34" y="60" width="86" height="7" rx="3.5" className="fill-text/30" />
    </Panel>
  )
}

export function DocumentsIllustration() {
  return (
    <Panel>
      {[2, 1, 0].map((depth) => (
        <rect
          key={depth}
          x={120 + depth * 16}
          y={74 + depth * 12}
          width="150"
          height="176"
          rx="10"
          strokeWidth="1.5"
          className={
            depth === 0
              ? 'fill-surface-alt stroke-primary/70'
              : 'fill-surface-alt/70 stroke-border'
          }
        />
      ))}
      <g className="animate-fade-in-up">
        <circle cx="150" cy="106" r="13" className="fill-primary/70" />
        <rect x="172" y="98" width="70" height="6" rx="3" className="fill-text/40" />
        <rect x="172" y="110" width="46" height="6" rx="3" className="fill-text-muted/40" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x="136"
            y={140 + i * 18}
            width={i % 2 === 0 ? 118 : 88}
            height="6"
            rx="3"
            className="fill-text-muted/25"
          />
        ))}
      </g>
      <g className="animate-float-slow">
        <circle cx="300" cy="90" r="18" className="fill-accent" />
        <path
          d="M292 90l6 6 11-12"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-on-accent"
        />
      </g>
    </Panel>
  )
}

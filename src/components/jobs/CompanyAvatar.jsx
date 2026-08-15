/**
 * Monogram avatar for a company.
 *
 * The mock data carried a hand-picked `companyIcon` emoji per row. There is no backend field
 * for that and no icon service wired up, so rather than drop the visual anchor entirely we
 * derive one: the company's initial, tinted by a hash of its name. Same company always gets
 * the same colour, which is what makes a list scannable.
 */

const PALETTE = [
  '#a855f7',
  '#6366f1',
  '#22d3ee',
  '#4ade9b',
  '#fb7185',
  '#fbbf24',
  '#38bdf8',
  '#f472b6',
]

function hashToIndex(value) {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % PALETTE.length
}

export function CompanyAvatar({ name = '', size = 'md', className = '' }) {
  const trimmed = name.trim()
  const initial = trimmed ? trimmed[0].toUpperCase() : '?'
  const color = PALETTE[hashToIndex(trimmed.toLowerCase())]

  const sizes = {
    sm: 'h-7 w-7 text-[11px] rounded-md',
    md: 'h-8 w-8 text-sm rounded-md',
    lg: 'h-11 w-11 text-base rounded-lg',
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center font-semibold ${sizes[size]} ${className}`}
      style={{ backgroundColor: `${color}1f`, color }}
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}

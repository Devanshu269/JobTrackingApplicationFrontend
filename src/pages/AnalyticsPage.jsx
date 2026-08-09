import { DASHBOARD_STATS, WEEKLY_TREND } from '../data/mockStats'
import { JOB_STATUSES } from '../data/mockJobs'

const FUNNEL_STAGES = [
  { key: 'wishlist', label: 'Thinking to Apply', count: DASHBOARD_STATS.wishlist },
  { key: 'applied', label: 'Applied', count: DASHBOARD_STATS.applied },
  { key: 'interview', label: 'Interview', count: DASHBOARD_STATS.interview },
  { key: 'offer', label: 'Offers', count: DASHBOARD_STATS.offer },
]

const DONUT_SEGMENTS = [
  { key: 'wishlist', label: 'Thinking to Apply', count: DASHBOARD_STATS.wishlist, color: '#a855f7' },
  { key: 'applied', label: 'Applied', count: DASHBOARD_STATS.applied, color: '#6366f1' },
  { key: 'interview', label: 'Interview', count: DASHBOARD_STATS.interview, color: '#22d3ee' },
  { key: 'offer', label: 'Offers', count: DASHBOARD_STATS.offer, color: '#4ade9b' },
  { key: 'rejected', label: 'Rejected', count: DASHBOARD_STATS.rejected, color: '#fb7185' },
]

export default function AnalyticsPage() {
  const maxTrend = Math.max(...WEEKLY_TREND.map((d) => d.count), 1)
  const totalForDonut = DONUT_SEGMENTS.reduce((sum, s) => sum + s.count, 0)

  // Compute SVG donut offsets
  let cumulativePercent = 0
  const donutData = DONUT_SEGMENTS.map((s) => {
    const percent = (s.count / totalForDonut) * 100
    const offset = cumulativePercent
    cumulativePercent += percent
    return { ...s, percent, offset }
  })

  const responseRate = DASHBOARD_STATS.total > 0
    ? Math.round(
        ((DASHBOARD_STATS.interview + DASHBOARD_STATS.offer + DASHBOARD_STATS.rejected) /
          DASHBOARD_STATS.total) *
          100,
      )
    : 0

  const offerRate = DASHBOARD_STATS.total > 0
    ? Math.round((DASHBOARD_STATS.offer / DASHBOARD_STATS.total) * 100)
    : 0

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text">Analytics</h1>
        <p className="mt-1 text-sm text-text-muted">
          Track your job search performance.
        </p>
      </div>

      {/* Metric cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Response Rate" value={`${responseRate}%`} subtitle="Applications that got a reply" color="#6366f1" />
        <MetricCard label="Offer Rate" value={`${offerRate}%`} subtitle="Applications → Offer" color="#4ade9b" />
        <MetricCard label="Active Pipeline" value={String(DASHBOARD_STATS.wishlist + DASHBOARD_STATS.applied + DASHBOARD_STATS.interview)} subtitle="Still in progress" color="#22d3ee" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Application Funnel */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-text">Application Funnel</h2>
          <p className="mt-0.5 text-[11px] text-text-muted">Conversion through stages</p>
          <div className="mt-6 flex flex-col gap-3">
            {FUNNEL_STAGES.map((stage) => {
              const widthPercent = DASHBOARD_STATS.total > 0
                ? Math.max((stage.count / DASHBOARD_STATS.total) * 100, 8)
                : 8
              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs text-text-muted">{stage.label}</span>
                  <div className="flex-1">
                    <div className="relative h-8 overflow-hidden rounded-md bg-surface-alt/60">
                      <div
                        className="flex h-full items-center rounded-md px-3 text-xs font-semibold text-on-primary transition-all duration-700"
                        style={{
                          width: `${widthPercent}%`,
                          backgroundColor: JOB_STATUSES[stage.key]?.color || '#7c6bf5',
                        }}
                      >
                        {stage.count}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status Distribution Donut */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-text">Status Distribution</h2>
          <p className="mt-0.5 text-[11px] text-text-muted">Breakdown of all applications</p>
          <div className="mt-6 flex items-center justify-center gap-8">
            {/* SVG Donut */}
            <div className="relative">
              <svg viewBox="0 0 120 120" className="h-36 w-36">
                {donutData.map((seg) => {
                  const circumference = 2 * Math.PI * 45
                  const dashLength = (seg.percent / 100) * circumference
                  const dashOffset = -((seg.offset / 100) * circumference)
                  return (
                    <circle
                      key={seg.key}
                      cx="60"
                      cy="60"
                      r="45"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="12"
                      strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                      style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
                    />
                  )
                })}
                <text x="60" y="56" textAnchor="middle" className="fill-text text-xl font-bold" fontSize="20">
                  {totalForDonut}
                </text>
                <text x="60" y="72" textAnchor="middle" className="fill-text-muted" fontSize="9">
                  Total
                </text>
              </svg>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-2">
              {donutData.map((seg) => (
                <div key={seg.key} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: seg.color }}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-text-muted">{seg.label}</span>
                  <span className="ml-auto text-xs font-semibold text-text">{seg.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Trend (full width) */}
      <div className="mt-6 glass-card p-6">
        <h2 className="text-sm font-semibold text-text">Weekly Activity</h2>
        <p className="mt-0.5 text-[11px] text-text-muted">Applications submitted per day</p>
        <div className="mt-6 flex items-end gap-3" style={{ height: '160px' }}>
          {WEEKLY_TREND.map((d, i) => {
            const heightPercent = maxTrend > 0 ? (d.count / maxTrend) * 100 : 0
            const isMax = d.count === Math.max(...WEEKLY_TREND.map((w) => w.count))
            return (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[11px] font-medium text-text-muted">{d.count}</span>
                <div className="relative w-full" style={{ height: '120px' }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${heightPercent}%`,
                      minHeight: d.count > 0 ? '8px' : '3px',
                      backgroundColor: isMax ? '#7c6bf5' : 'rgba(124, 107, 245, 0.2)',
                      animationDelay: `${i * 80}ms`,
                    }}
                  />
                </div>
                <span className="text-[11px] text-text-muted">{d.day}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, subtitle, color }) {
  return (
    <div className="glass-card group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1">
      <div
        className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="mt-1.5 text-3xl font-bold tracking-tight text-text" style={{ color }}>
        {value}
      </p>
      <p className="mt-1 text-[11px] text-text-muted">{subtitle}</p>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { JOB_STATUSES } from '../data/jobConstants'
import { getJobStats, getJobTrend } from '../lib/jobsApi'
import { getApiErrorMessage } from '../lib/api'
import { Alert } from '../components/ui/Alert'

const FUNNEL_KEYS = ['WISHLIST', 'APPLIED', 'INTERVIEW', 'OFFER']
const DONUT_KEYS = ['WISHLIST', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED']

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null)
  const [weeklyTrend, setWeeklyTrend] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [statsData, trendData] = await Promise.all([
          getJobStats(), 
          getJobTrend(7)
        ])
        if (cancelled) return
        setStats(statsData)
        
        const mappedTrend = (trendData || []).map((t) => ({
          key: t.date,
          day: new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
          count: t.count
        }))
        setWeeklyTrend(mappedTrend)
        setError('')
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, 'Could not load your analytics.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const maxTrend = Math.max(...weeklyTrend.map((d) => d.count), 1)

  const total = stats?.total ?? 0
  const byStatus = stats?.byStatus ?? {}
  const count = (key) => byStatus[key] ?? 0

  const donutTotal = DONUT_KEYS.reduce((sum, key) => sum + count(key), 0)

  let cumulativePercent = 0
  const donutData = DONUT_KEYS.map((key) => {
    const percent = donutTotal > 0 ? (count(key) / donutTotal) * 100 : 0
    const offset = cumulativePercent
    cumulativePercent += percent
    return { key, ...JOB_STATUSES[key], count: count(key), percent, offset }
  })

  const responded = count('INTERVIEW') + count('OFFER') + count('REJECTED')
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0
  const offerRate = total > 0 ? Math.round((count('OFFER') / total) * 100) : 0
  const activePipeline = count('WISHLIST') + count('APPLIED') + count('INTERVIEW')

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text">Analytics</h1>
        <p className="mt-1 text-sm text-text-muted">Track your job search performance.</p>
      </div>

      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Response Rate"
          value={loading ? '—' : `${responseRate}%`}
          subtitle="Applications that got a reply"
          color="#6366f1"
        />
        <MetricCard
          label="Offer Rate"
          value={loading ? '—' : `${offerRate}%`}
          subtitle="Applications → Offer"
          color="#4ade9b"
        />
        <MetricCard
          label="Active Pipeline"
          value={loading ? '—' : String(activePipeline)}
          subtitle="Still in progress"
          color="#22d3ee"
        />
      </div>

      {total === 0 && !loading && !error && (
        <div className="mt-8 rounded-xl border border-dashed border-border/60 bg-surface/30 py-14 text-center">
          <p className="text-sm font-medium text-text">Nothing to analyse yet</p>
          <p className="mt-1 text-xs text-text-muted">
            Add a few applications and these charts will fill in.
          </p>
        </div>
      )}

      {total > 0 && (
        <>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* Application Funnel */}
            <div className="glass-card p-6">
              <h2 className="text-sm font-semibold text-text">Application Funnel</h2>
              <p className="mt-0.5 text-[11px] text-text-muted">Conversion through stages</p>
              <div className="mt-6 flex flex-col gap-3">
                {FUNNEL_KEYS.map((key) => {
                  const stageCount = count(key)
                  const widthPercent = Math.max((stageCount / total) * 100, 8)
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-xs text-text-muted">
                        {JOB_STATUSES[key].label}
                      </span>
                      <div className="flex-1">
                        <div className="relative h-8 overflow-hidden rounded-md bg-surface-alt/60">
                          <div
                            className="flex h-full items-center rounded-md px-3 text-xs font-semibold text-on-primary transition-all duration-700"
                            style={{
                              width: `${widthPercent}%`,
                              backgroundColor: JOB_STATUSES[key].color,
                            }}
                          >
                            {stageCount}
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
              <div className="mt-6 flex flex-wrap items-center justify-center gap-8">
                <div className="relative">
                  <svg viewBox="0 0 120 120" className="h-36 w-36">
                    {donutData.map((seg) => {
                      const circumference = 2 * Math.PI * 45
                      const dashLength = (seg.percent / 100) * circumference
                      const dashOffset = -((seg.offset / 100) * circumference)
                      if (seg.count === 0) return null
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
                          strokeLinecap="butt"
                          className="transition-all duration-700"
                          style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
                        />
                      )
                    })}
                    <text x="60" y="56" textAnchor="middle" className="fill-text text-xl font-bold" fontSize="20">
                      {donutTotal}
                    </text>
                    <text x="60" y="72" textAnchor="middle" className="fill-text-muted" fontSize="9">
                      Total
                    </text>
                  </svg>
                </div>

                <div className="flex flex-col gap-2">
                  {donutData.map((seg) => (
                    <div key={seg.key} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: seg.color }}
                        aria-hidden="true"
                      />
                      <span className="text-xs text-text-muted">{seg.label}</span>
                      <span className="ml-auto pl-3 text-xs font-semibold text-text">{seg.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Trend */}
          <div className="mt-6 glass-card p-6">
            <h2 className="text-sm font-semibold text-text">Weekly Activity</h2>
            <p className="mt-0.5 text-[11px] text-text-muted">
              Applications added per day, last 7 days
            </p>
            <div className="mt-6 flex items-end gap-3" style={{ height: '160px' }}>
              {weeklyTrend.map((d, i) => (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-[11px] font-medium text-text-muted">{d.count}</span>
                  <div className="relative w-full" style={{ height: '120px' }}>
                    <div
                      className="absolute bottom-0 w-full rounded-t-lg transition-all duration-500"
                      style={{
                        height: `${(d.count / maxTrend) * 100}%`,
                        minHeight: d.count > 0 ? '8px' : '3px',
                        backgroundColor:
                          d.count > 0 && d.count === maxTrend ? '#7c6bf5' : 'rgba(124, 107, 245, 0.2)',
                        animationDelay: `${i * 80}ms`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-text-muted">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
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

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { JOB_STATUSES, KANBAN_COLUMNS, getStatusAccent } from '../data/jobConstants'
import { listJobs, getJobStats, listUpcomingRounds, listActivity } from '../lib/jobsApi'
import { getApiErrorMessage } from '../lib/api'
import { buildWeeklyTrend, formatDateTime, formatRelative } from '../lib/dates'
import { buildActivityFeed, mapApiActivity, describeActivity, ACTIVITY_ACTIONS } from '../lib/activity'
import { StatCard } from '../components/ui/StatCard'
import { CompanyAvatar } from '../components/ui/CompanyAvatar'
import { Alert } from '../components/ui/Alert'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [jobs, setJobs] = useState([])
  const [stats, setStats] = useState(null)
  const [upcoming, setUpcoming] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [jobData, statsData, upcomingData] = await Promise.all([
          listJobs(),
          getJobStats(),
          listUpcomingRounds(),
        ])
        if (cancelled) return
        setJobs(jobData)
        setStats(statsData)
        setUpcoming(upcomingData)

        // Real audit log — falls back to derived feed if the endpoint isn't deployed yet.
        try {
          const activityData = await listActivity(8)
          if (!cancelled) setActivity(mapApiActivity(activityData))
        } catch {
          if (!cancelled) setActivity(buildActivityFeed(jobData))
        }

        setError('')
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, 'Could not load your dashboard.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // No trend endpoint exists — bucket the jobs we already fetched by day instead.
  const weeklyTrend = useMemo(() => buildWeeklyTrend(jobs), [jobs])
  const maxTrend = Math.max(...weeklyTrend.map((d) => d.count), 1)



  const miniKanban = useMemo(
    () =>
      KANBAN_COLUMNS.map((col) => ({
        ...col,
        jobs: jobs.filter((j) => col.statuses.includes(j.status)).slice(0, 3),
      })),
    [jobs],
  )

  // byStatus is always zero-filled by the API, so these render without null checks once loaded.
  const byStatus = stats?.byStatus ?? {}

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text">
          Welcome back, {user?.userFirstName ?? 'there'} 👋
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Here&apos;s an overview of your job search progress.
        </p>
      </div>

      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Applications" value={loading ? '—' : stats?.total ?? 0} icon="📋" accentColor="#a855f7" />
        <StatCard label="In Interview" value={loading ? '—' : byStatus.INTERVIEW ?? 0} icon="🎤" accentColor="#22d3ee" />
        <StatCard label="Offers Received" value={loading ? '—' : byStatus.OFFER ?? 0} icon="🎉" accentColor="#4ade9b" />
        <StatCard label="Rejected" value={loading ? '—' : byStatus.REJECTED ?? 0} icon="📊" accentColor="#fb7185" />
      </div>

      {/* Mini Kanban + Weekly Trend */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">Application Pipeline</h2>
            <Link
              to="/JobJuggler/applications"
              className="text-xs font-medium text-primary transition-colors duration-200 hover:text-primary-hover"
            >
              View all →
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {miniKanban.map((col) => (
              <div key={col.key} className="glass-card flex flex-col p-3">
                <div className="flex items-center gap-2 pb-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: JOB_STATUSES[col.statuses[0]].color }}
                    aria-hidden="true"
                  />
                  <span className="text-[11px] font-semibold text-text-muted">{col.label}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {col.jobs.length === 0 && (
                    <p className="py-3 text-center text-[11px] text-text-muted/50">
                      {loading ? '…' : 'No jobs'}
                    </p>
                  )}
                  {col.jobs.map((job) => {
                    const accent = getStatusAccent(job.status)
                    return (
                      <button
                        key={job.jobId}
                        type="button"
                        onClick={() => navigate(`/JobJuggler/applications/${job.jobId}`)}
                        className="rounded-md border border-border/50 bg-surface-alt/50 p-2 text-left transition-all duration-200 hover:border-border"
                        style={accent ? { borderColor: `${accent}40` } : undefined}
                      >
                        <div className="flex items-center gap-2">
                          <CompanyAvatar name={job.companyName} size="sm" className="!h-6 !w-6 !text-[10px]" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-text">{job.jobRole}</p>
                            <p className="truncate text-[10px] text-text-muted">{job.companyName}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Trend — derived client-side from appliedDate (or createdAt) */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-text">This Week</h2>
          <p className="mt-0.5 text-[11px] text-text-muted">Applications per day</p>
          <div className="mt-5 flex items-end gap-2">
            {weeklyTrend.map((d, i) => (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="relative w-full" style={{ height: '100px' }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t-md transition-all duration-500"
                    style={{
                      height: `${(d.count / maxTrend) * 100}%`,
                      minHeight: d.count > 0 ? '8px' : '2px',
                      backgroundColor:
                        d.count > 0 && d.count === maxTrend ? '#7c6bf5' : 'rgba(124, 107, 245, 0.25)',
                      animationDelay: `${i * 80}ms`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-text-muted">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: Upcoming Interviews + Recent Activity */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Upcoming interviews — GET /api/rounds/upcoming, one request across all jobs */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Upcoming Interviews</h2>
            {upcoming.length > 4 && (
              <span className="text-[11px] text-text-muted">{upcoming.length} scheduled</span>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {!loading && upcoming.length === 0 && (
              <p className="py-6 text-center text-xs text-text-muted/70">
                Nothing scheduled. Add a round with a future date on any application.
              </p>
            )}
            {upcoming.slice(0, 4).map((round) => (
              <button
                key={round.jobRoundId}
                type="button"
                onClick={() => navigate(`/JobJuggler/applications/${round.jobId}`)}
                className="flex items-start gap-3 rounded-lg border border-border/40 bg-surface-alt/30 p-3 text-left transition-all duration-200 hover:border-accent/30"
              >
                <CompanyAvatar name={round.companyName} size="lg" className="!h-10 !w-10" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text">{round.companyName}</p>
                  <p className="truncate text-xs text-text-muted">{round.jobRole}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-accent">
                    <span>📅 {formatDateTime(round.roundDate)}</span>
                    {round.interviewerName && <span>· {round.interviewerName}</span>}
                  </div>
                </div>
                <span className="shrink-0 rounded bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                  {round.roundType}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent activity — derived from job createdAt/updatedAt, not an audit log.
            See src/lib/activity.js for what that can and cannot show. */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Recent Activity</h2>
            <Link
              to="/JobJuggler/activity"
              className="text-[11px] font-medium text-primary transition-colors duration-200 hover:text-primary-hover"
            >
              View all →
            </Link>
          </div>
          <div className="mt-4 flex flex-col">
            {!loading && activity.length === 0 && (
              <p className="py-6 text-center text-xs text-text-muted/70">
                Nothing yet. Adding or editing an application shows up here.
              </p>
            )}
            {activity.map((event, i) => {
              const meta = ACTIVITY_ACTIONS[event.action] ?? ACTIVITY_ACTIONS.JOB_UPDATED
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => navigate(`/JobJuggler/applications/${event.jobId}`)}
                  className="flex items-start gap-3 rounded-md py-2.5 pr-1 text-left transition-colors duration-200 hover:bg-surface-alt/40"
                >
                  <div className="relative flex flex-col items-center self-stretch">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs"
                      style={{ backgroundColor: `${meta.color}15` }}
                      aria-hidden="true"
                    >
                      {meta.emoji}
                    </span>
                    {i < activity.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-border/50" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-2">
                    <p className="text-sm text-text">{describeActivity(event)}</p>
                    <p className="mt-0.5 text-[11px] text-text-muted">
                      {formatRelative(event.timestamp)}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

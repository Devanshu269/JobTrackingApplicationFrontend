import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MOCK_USER } from '../data/mockUser'
import { INITIAL_JOBS, JOB_STATUSES, KANBAN_COLUMNS } from '../data/mockJobs'
import {
  DASHBOARD_STATS,
  WEEKLY_TREND,
  UPCOMING_INTERVIEWS,
  RECENT_ACTIVITY,
} from '../data/mockStats'
import { StatCard } from '../components/ui/StatCard'

const ACTIVITY_ICONS = {
  offer_received: { emoji: '🎉', color: '#4ade9b' },
  applied: { emoji: '📤', color: '#6366f1' },
  rejected: { emoji: '❌', color: '#fb7185' },
  interview_scheduled: { emoji: '📅', color: '#22d3ee' },
  status_change: { emoji: '🔄', color: '#a855f7' },
}

export default function DashboardPage() {
  const { user } = useAuth()
  const displayUser = user || MOCK_USER

  // Mini kanban — show first 3 jobs per column
  const miniKanban = KANBAN_COLUMNS.map((col) => ({
    ...col,
    jobs: INITIAL_JOBS.filter((j) => col.statuses.includes(j.status)).slice(0, 3),
  }))

  const maxTrend = Math.max(...WEEKLY_TREND.map((d) => d.count), 1)

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text">
          Welcome back, {displayUser.userFirstName} 👋
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Here&apos;s an overview of your job search progress.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Applications"
          value={DASHBOARD_STATS.total}
          icon="📋"
          accentColor="#a855f7"
        />
        <StatCard
          label="In Interview"
          value={DASHBOARD_STATS.interview}
          icon="🎤"
          accentColor="#22d3ee"
        />
        <StatCard
          label="Offers Received"
          value={DASHBOARD_STATS.offer}
          icon="🎉"
          accentColor="#4ade9b"
        />
        <StatCard
          label="Rejected"
          value={DASHBOARD_STATS.rejected}
          icon="📊"
          accentColor="#fb7185"
        />
      </div>

      {/* Main content grid: Mini Kanban + Weekly Trend + Activity */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Mini Kanban — 2 cols wide */}
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
            {miniKanban.map((col) => {
              const colColor =
                col.key === 'offer-rejected'
                  ? JOB_STATUSES.offer.color
                  : JOB_STATUSES[col.statuses[0]].color
              return (
                <div key={col.key} className="glass-card flex flex-col p-3">
                  <div className="flex items-center gap-2 pb-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: colColor }}
                      aria-hidden="true"
                    />
                    <span className="text-[11px] font-semibold text-text-muted">{col.label}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {col.jobs.length === 0 && (
                      <p className="py-3 text-center text-[11px] text-text-muted/50">No jobs</p>
                    )}
                    {col.jobs.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-md border border-border/50 bg-surface-alt/50 p-2 transition-all duration-200 hover:border-border"
                        style={{
                          borderColor:
                            job.outcome === 'accepted'
                              ? '#4ade9b40'
                              : job.outcome === 'rejected'
                                ? '#fb718540'
                                : undefined,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{job.companyIcon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-text">{job.position}</p>
                            <p className="truncate text-[10px] text-text-muted">{job.company}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Weekly Trend */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-text">This Week</h2>
          <p className="mt-0.5 text-[11px] text-text-muted">Applications per day</p>
          <div className="mt-5 flex items-end gap-2">
            {WEEKLY_TREND.map((d, i) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="relative w-full" style={{ height: '100px' }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t-md transition-all duration-500"
                    style={{
                      height: `${(d.count / maxTrend) * 100}%`,
                      minHeight: d.count > 0 ? '8px' : '2px',
                      backgroundColor:
                        d.count === Math.max(...WEEKLY_TREND.map((w) => w.count))
                          ? '#7c6bf5'
                          : 'rgba(124, 107, 245, 0.25)',
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
        {/* Upcoming Interviews */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-text">Upcoming Interviews</h2>
          <div className="mt-4 flex flex-col gap-3">
            {UPCOMING_INTERVIEWS.map((interview) => (
              <div
                key={interview.id}
                className="flex items-start gap-3 rounded-lg border border-border/40 bg-surface-alt/30 p-3 transition-all duration-200 hover:border-accent/30"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-lg">
                  {interview.companyIcon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text">{interview.company}</p>
                  <p className="truncate text-xs text-text-muted">{interview.position}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-accent">
                    <span>📅 {formatDate(interview.date)}</span>
                    <span>⏰ {interview.time}</span>
                  </div>
                </div>
                <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                  {interview.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-text">Recent Activity</h2>
          <div className="mt-4 flex flex-col">
            {RECENT_ACTIVITY.map((activity, i) => {
              const icon = ACTIVITY_ICONS[activity.action] || { emoji: '📌', color: '#7c6bf5' }
              return (
                <div key={activity.id} className="flex items-start gap-3 py-2.5">
                  {/* Timeline line + dot */}
                  <div className="relative flex flex-col items-center">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs"
                      style={{ backgroundColor: `${icon.color}15` }}
                    >
                      {icon.emoji}
                    </span>
                    {i < RECENT_ACTIVITY.length - 1 && (
                      <span className="mt-1 h-full w-px bg-border/50" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-2">
                    <p className="text-sm text-text">{activity.description}</p>
                    <p className="mt-0.5 text-[11px] text-text-muted">
                      {formatTimestamp(activity.timestamp)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatTimestamp(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now - d
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

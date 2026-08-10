import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listActivity } from '../lib/jobsApi'
import { mapApiActivity, describeActivity, ACTIVITY_ACTIONS } from '../lib/activity'
import { JOB_STATUSES } from '../data/jobConstants'
import { getApiErrorMessage } from '../lib/api'
import { formatRelative, formatDateTime } from '../lib/dates'
import { CompanyAvatar } from '../components/ui/CompanyAvatar'
import { Alert } from '../components/ui/Alert'

const PAGE_SIZE = 25

export default function ActivityPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const load = useCallback(async (pageNum, isAppend = false) => {
    try {
      const data = await listActivity(pageNum, PAGE_SIZE)
      const mapped = mapApiActivity(data.content || [])
      setEvents(prev => isAppend ? [...prev, ...mapped] : mapped)
      setHasMore(!data.last)
      setError('')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load activity.'))
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load(0).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [load])

  async function handleLoadMore() {
    const nextPage = page + 1
    setLoadingMore(true)
    setPage(nextPage)
    await load(nextPage, true)
    setLoadingMore(false)
  }

  // Group events by date for the timeline
  const grouped = groupByDate(events)

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text">Activity</h1>
        <p className="mt-1 text-sm text-text-muted">
          A timeline of everything that happened in your job search.
        </p>
      </div>

      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="h-10 w-10 animate-pulse rounded-full bg-surface-alt/80" />
                {i < 4 && <div className="mt-2 w-px flex-1 bg-border/30" />}
              </div>
              <div className="flex-1 space-y-2 pb-6">
                <div className="h-4 w-3/4 animate-pulse rounded bg-surface-alt/60" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-surface-alt/40" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && events.length === 0 && !error && (
        <div className="glass-card flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-4xl">📭</span>
          <div>
            <p className="text-sm font-medium text-text">No activity yet</p>
            <p className="mt-1 text-xs text-text-muted">
              Create a job application and your activity will show up here.
            </p>
          </div>
        </div>
      )}

      {/* Timeline */}
      {!loading && events.length > 0 && (
        <div className="relative">
          {grouped.map((group) => (
            <div key={group.dateKey}>
              {/* Date header */}
              <div className="sticky top-0 z-10 mb-4 mt-1">
                <span className="inline-block rounded-full border border-border/50 bg-surface/90 px-3 py-1 text-[11px] font-semibold text-text-muted backdrop-blur-md">
                  {group.label}
                </span>
              </div>

              {/* Events in this date group */}
              <div className="ml-1 border-l border-border/40 pl-6">
                {group.events.map((event) => {
                  const meta = ACTIVITY_ACTIONS[event.action] ?? ACTIVITY_ACTIONS.JOB_UPDATED
                  const isDeleted = event.action === 'JOB_DELETED'

                  return (
                    <div
                      key={event.id}
                      className="group relative"
                    >
                      {/* Timeline node */}
                      <div
                        className="absolute -left-6 top-0 flex -translate-x-1/2 items-center justify-center"
                      >
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-full text-sm ring-4 ring-bg transition-all duration-200 group-hover:scale-110"
                          style={{ backgroundColor: `${meta.color}20` }}
                        >
                          {meta.emoji}
                        </span>
                      </div>

                      {/* Event card */}
                      <button
                        type="button"
                        onClick={() => !isDeleted && navigate(`/JobJuggler/applications/${event.jobId}`)}
                        disabled={isDeleted}
                        className={`mb-5 ml-3 flex w-full items-start gap-3.5 rounded-xl border border-border/40 bg-surface/40 px-4 py-3.5 text-left backdrop-blur-sm transition-all duration-200 ${
                          isDeleted
                            ? 'cursor-default opacity-70'
                            : 'hover:border-border/70 hover:bg-surface/60 hover:shadow-lg hover:shadow-black/20'
                        }`}
                      >
                        <CompanyAvatar name={event.companyName} size="lg" className="!h-10 !w-10 shrink-0" />

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-text">
                            {describeActivity(event)}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {/* Status transition badge for STATUS_CHANGED */}
                            {event.action === 'STATUS_CHANGED' && event.previousStatus && (
                              <span className="inline-flex items-center gap-1 text-[11px]">
                                <span
                                  className="inline-block h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: JOB_STATUSES[event.previousStatus]?.color ?? '#64748b' }}
                                />
                                <span className="text-text-muted">{JOB_STATUSES[event.previousStatus]?.label}</span>
                                <span className="text-text-muted/50">→</span>
                                <span
                                  className="inline-block h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: JOB_STATUSES[event.status]?.color ?? '#64748b' }}
                                />
                                <span className="text-text-muted">{JOB_STATUSES[event.status]?.label}</span>
                              </span>
                            )}

                            {/* Action badge for non-transition events */}
                            {event.action !== 'STATUS_CHANGED' && event.status && !isDeleted && (
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                                style={{
                                  backgroundColor: `${JOB_STATUSES[event.status]?.color ?? '#64748b'}15`,
                                  color: JOB_STATUSES[event.status]?.color ?? '#64748b',
                                }}
                              >
                                {JOB_STATUSES[event.status]?.label ?? event.status}
                              </span>
                            )}

                            {isDeleted && (
                              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger">
                                Deleted
                              </span>
                            )}

                            <span
                              className="text-[11px] text-text-muted/60"
                              title={formatDateTime(event.timestamp)}
                            >
                              {formatRelative(event.timestamp)}
                            </span>
                          </div>

                          <p className="mt-0.5 text-[11px] text-text-muted/50">
                            {event.jobRole} · {event.companyName}
                          </p>
                        </div>

                        {/* Arrow for navigable events */}
                        {!isDeleted && (
                          <svg
                            viewBox="0 0 16 16"
                            className="mt-1 h-4 w-4 shrink-0 text-text-muted/30 transition-all duration-200 group-hover:text-text-muted group-hover:translate-x-0.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M6 4l4 4-4 4" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-lg border border-border/50 bg-surface/50 px-5 py-2 text-xs font-medium text-text-muted backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:bg-surface/70 hover:text-text disabled:opacity-50"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading…
                  </span>
                ) : (
                  'Load more'
                )}
              </button>
            </div>
          )}

          {/* End of timeline marker */}
          {!hasMore && events.length > 0 && (
            <div className="mt-4 flex justify-center">
              <span className="rounded-full border border-border/30 bg-surface-alt/40 px-3 py-1 text-[10px] text-text-muted/50">
                That's everything
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Groups events by calendar day for a sectioned timeline.
 * Returns [{ dateKey: 'YYYY-MM-DD', label: 'Today' | 'Yesterday' | 'Aug 5', events: [...] }]
 */
function groupByDate(events) {
  const groups = []
  let currentKey = null
  let currentGroup = null

  const todayKey = toLocalKey(new Date())
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = toLocalKey(yesterday)

  for (const event of events) {
    const key = event.timestamp?.slice(0, 10) ?? ''
    if (key !== currentKey) {
      currentKey = key
      let label = key
      if (key === todayKey) label = 'Today'
      else if (key === yesterdayKey) label = 'Yesterday'
      else {
        const d = new Date(key + 'T00:00:00')
        label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      }
      currentGroup = { dateKey: key, label, events: [] }
      groups.push(currentGroup)
    }
    currentGroup.events.push(event)
  }

  return groups
}

function toLocalKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

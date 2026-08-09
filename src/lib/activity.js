/**
 * The Recent Activity feed.
 *
 * There is no activity endpoint yet, so events are **derived from timestamps the API already
 * returns** rather than read from an audit log. Everything here is real data — no invented
 * events — but the derivation has hard limits, and they're worth knowing before trusting it:
 *
 *   - **One edit per job, not a history.** `updatedAt` is `@LastModifiedDate`, so it only ever
 *     holds the *most recent* save. Five edits to one job produce one event, not five.
 *   - **It can't say what changed.** An edit event reports the job's status *as it is now*,
 *     which is a true statement about the current row; it deliberately does not claim
 *     "moved to Interview", because the previous value isn't recoverable from the response.
 *   - **No round or deletion events.** Deleted jobs are gone from `GET /api/jobs` entirely, and
 *     past rounds aren't reachable without one request per job.
 *
 * `ACTIVITY_ACTIONS` and the returned event shape intentionally match what a real
 * `GET /api/activity` should return, so swapping this out later is a one-line change in
 * DashboardPage rather than a rewrite of the widget. See BACKEND_INTEGRATION.md →
 * "Recent Activity: deriving it now, logging it later".
 */

import { JOB_STATUSES } from '../data/jobConstants'

export const ACTIVITY_ACTIONS = {
  JOB_CREATED: { emoji: '📤', color: '#6366f1', verb: 'Added' },
  JOB_UPDATED: { emoji: '🔄', color: '#a855f7', verb: 'Updated' },
  STATUS_CHANGED: { emoji: '🔄', color: '#a855f7', verb: 'Moved' },
  OFFER_RECEIVED: { emoji: '🎉', color: '#4ade9b', verb: 'Offer from' },
  REJECTED: { emoji: '❌', color: '#fb7185', verb: 'Rejected by' },
  ROUND_SCHEDULED: { emoji: '📅', color: '#22d3ee', verb: 'Interview scheduled with' },
}

/**
 * An edit is classified by the job's *current* status, which is the only thing we can state
 * truthfully. OFFER and REJECTED are terminal enough that "offer received" / "rejected by" is
 * a fair reading of the latest edit; anything else stays the neutral "Updated".
 */
function editAction(status) {
  if (status === 'OFFER') return 'OFFER_RECEIVED'
  if (status === 'REJECTED') return 'REJECTED'
  return 'JOB_UPDATED'
}

/**
 * @param {Array} jobs — from `GET /api/jobs`
 * @returns {Array} newest first, each `{ id, action, jobId, companyName, jobRole, status, timestamp }`
 */
export function buildActivityFeed(jobs, { limit = 8 } = {}) {
  const events = []

  for (const job of jobs) {
    if (job.createdAt) {
      events.push({
        id: `job-${job.jobId}-created`,
        action: 'JOB_CREATED',
        jobId: job.jobId,
        companyName: job.companyName,
        jobRole: job.jobRole,
        status: job.status,
        timestamp: job.createdAt,
      })
    }

    // Equal timestamps mean the row has never been edited since insert — no second event.
    if (job.updatedAt && job.updatedAt !== job.createdAt) {
      events.push({
        id: `job-${job.jobId}-updated`,
        action: editAction(job.status),
        jobId: job.jobId,
        companyName: job.companyName,
        jobRole: job.jobRole,
        status: job.status,
        timestamp: job.updatedAt,
      })
    }
  }

  // String comparison is safe and timezone-free: LocalDateTime is fixed-width ISO-8601.
  events.sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0))
  return events.slice(0, limit)
}

/** Human-readable line for an event, shared by the derived feed and any future real one. */
export function describeActivity(event) {
  const action = ACTIVITY_ACTIONS[event.action] ?? ACTIVITY_ACTIONS.JOB_UPDATED
  if (event.action === 'JOB_CREATED') {
    return `${action.verb} ${event.jobRole} at ${event.companyName}`
  }
  if (event.action === 'JOB_UPDATED') {
    const label = JOB_STATUSES[event.status]?.label
    return label ? `${action.verb} ${event.companyName} — ${label}` : `${action.verb} ${event.companyName}`
  }
  return `${action.verb} ${event.companyName}`
}

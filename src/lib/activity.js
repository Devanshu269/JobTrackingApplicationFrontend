/**
 * The Recent Activity feed.
 *
 * Two data sources, selected at the call site:
 *
 *   1. **`GET /api/activity`** — the real append-only audit log. Has full edit history, actual
 *      `previousStatus → status` transitions, round events, and survives deletion. The response
 *      shape uses `id`/`timestamp`/`status`/`previousStatus` and is ready to render directly.
 *
 *   2. **`buildActivityFeed(jobs)`** — the derived fallback, still here for graceful degradation
 *      if the backend endpoint isn't deployed. See the caveats below.
 *
 * `ACTIVITY_ACTIONS` and `describeActivity()` are shared by both sources.
 */

import { JOB_STATUSES } from '../data/jobConstants'

export const ACTIVITY_ACTIONS = {
  JOB_CREATED: { emoji: '📤', color: '#6366f1', verb: 'Added' },
  JOB_UPDATED: { emoji: '🔄', color: '#a855f7', verb: 'Updated' },
  STATUS_CHANGED: { emoji: '🔄', color: '#a855f7', verb: 'Moved' },
  OFFER_RECEIVED: { emoji: '🎉', color: '#4ade9b', verb: 'Offer from' },
  REJECTED: { emoji: '❌', color: '#fb7185', verb: 'Rejected by' },
  ROUND_SCHEDULED: { emoji: '📅', color: '#22d3ee', verb: 'Interview scheduled with' },
  JOB_DELETED: { emoji: '🗑️', color: '#64748b', verb: 'Removed' },
}

/**
 * Maps the API response (which uses `timestamp`) into the shape the widgets expect.
 * The API already returns `{ id, action, jobId, companyName, jobRole, status, previousStatus, timestamp }`,
 * so this is mostly a pass-through — but it normalises any future field-name drift.
 */
export function mapApiActivity(apiEvents) {
  return apiEvents.map((e) => ({
    id: e.id,
    action: e.action,
    jobId: e.jobId,
    companyName: e.companyName,
    jobRole: e.jobRole,
    status: e.status,
    previousStatus: e.previousStatus ?? null,
    timestamp: e.timestamp,
  }))
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
 * Derived fallback — used when `GET /api/activity` isn't available.
 *
 * Limitations (documented for context, not because they can be fixed here):
 *   - **One edit per job, not a history.** `updatedAt` is `@LastModifiedDate`.
 *   - **It can't say what changed.** Reports the current status, not a transition.
 *   - **No round or deletion events.**
 *
 * @param {Array} jobs — from `GET /api/jobs`
 * @returns {Array} newest first
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
        previousStatus: null,
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
        previousStatus: null,
        timestamp: job.updatedAt,
      })
    }
  }

  // String comparison is safe and timezone-free: LocalDateTime is fixed-width ISO-8601.
  events.sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0))
  return events.slice(0, limit)
}

/** Human-readable line for an event, shared by the derived feed and the real one. */
export function describeActivity(event) {
  const action = ACTIVITY_ACTIONS[event.action] ?? ACTIVITY_ACTIONS.JOB_UPDATED

  if (event.action === 'JOB_CREATED') {
    return `${action.verb} ${event.jobRole} at ${event.companyName}`
  }

  if (event.action === 'JOB_DELETED') {
    return `${action.verb} ${event.jobRole} at ${event.companyName}`
  }

  // Real API carries previousStatus on transitions — show the arrow when available.
  if (event.action === 'STATUS_CHANGED' && event.previousStatus) {
    const from = JOB_STATUSES[event.previousStatus]?.label ?? event.previousStatus
    const to = JOB_STATUSES[event.status]?.label ?? event.status
    return `${event.companyName} — ${from} → ${to}`
  }

  if (event.action === 'OFFER_RECEIVED') {
    return `${action.verb} ${event.companyName}`
  }

  if (event.action === 'REJECTED') {
    return `${action.verb} ${event.companyName}`
  }

  if (event.action === 'ROUND_SCHEDULED') {
    return `${action.verb} ${event.companyName}`
  }

  if (event.action === 'JOB_UPDATED') {
    const label = JOB_STATUSES[event.status]?.label
    return label ? `${action.verb} ${event.companyName} — ${label}` : `${action.verb} ${event.companyName}`
  }

  return `${action.verb} ${event.companyName}`
}

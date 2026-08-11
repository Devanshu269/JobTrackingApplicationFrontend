/**
 * The Recent Activity feed.
 *
 * Driven by **`GET /api/activity`** — the real append-only audit log. Has full edit history, actual
 * `previousStatus → status` transitions, round events, and survives deletion. The response
 * shape uses `id`/`timestamp`/`status`/`previousStatus` and is ready to render directly.
 *
 * `ACTIVITY_ACTIONS` and `describeActivity()` are used by the UI to format these events.
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

/** Human-readable line for an event. */
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

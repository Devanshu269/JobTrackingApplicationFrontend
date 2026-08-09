/**
 * UI configuration for job applications — labels, colours and column grouping.
 *
 * Every key here is an exact backend enum value, so objects from the API can be used to index
 * these maps directly with no translation layer. Getting the casing wrong is silent: a lookup
 * just returns undefined and the badge disappears.
 *
 * This file replaces the constants that used to live in `mockJobs.js`. It holds no data —
 * jobs come from `src/lib/jobsApi.js`.
 */

/** Status enum: WISHLIST, APPLIED, INTERVIEW, OFFER, REJECTED. */
export const JOB_STATUSES = {
  WISHLIST: { key: 'WISHLIST', label: 'Thinking to Apply', color: '#a855f7' },
  APPLIED: { key: 'APPLIED', label: 'Applied', color: '#6366f1' },
  INTERVIEW: { key: 'INTERVIEW', label: 'In Interview Process', color: '#22d3ee' },
  OFFER: { key: 'OFFER', label: 'Offer Received', color: '#4ade9b' },
  REJECTED: { key: 'REJECTED', label: 'Rejected', color: '#fb7185' },
}

/** The 4 Kanban columns in display order. The last column shows both offers and rejections. */
export const KANBAN_COLUMNS = [
  { key: 'WISHLIST', label: 'Thinking to Apply', statuses: ['WISHLIST'] },
  { key: 'APPLIED', label: 'Applied', statuses: ['APPLIED'] },
  { key: 'INTERVIEW', label: 'In Interview Process', statuses: ['INTERVIEW'] },
  { key: 'OFFER_REJECTED', label: 'Offer Received / Rejected', statuses: ['OFFER', 'REJECTED'] },
]

/** JobType enum. Nullable on the backend — a job created before this field existed has none. */
export const JOB_TYPES = {
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
  ONSITE: 'On-site',
}

/** Priority enum. Nullable. */
export const JOB_PRIORITIES = {
  HIGH: { label: 'High', color: '#fb7185' },
  MEDIUM: { label: 'Medium', color: '#fbbf24' },
  LOW: { label: 'Low', color: '#64748b' },
}

/**
 * RoundType enum — PascalCase, unlike every other enum in the API. Sending an uppercase
 * value here is a 400 from Spring's JSON parser, so these strings are load-bearing.
 */
export const ROUND_TYPES = [
  'Technical',
  'HR',
  'Managerial',
  'Group',
  'Coding',
  'Behavioral',
  'CaseStudy',
  'HLD',
  'LLD',
  'SystemDesign',
  'CultureFit',
  'Other',
]

/** Outcome enum — lives on an interview round, never on the job itself. */
export const ROUND_OUTCOMES = {
  PENDING: { label: 'Pending', color: '#fbbf24' },
  ACCEPTED: { label: 'Accepted', color: '#4ade9b' },
  REJECTED: { label: 'Rejected', color: '#fb7185' },
  NO_RESPONSE: { label: 'No response', color: '#64748b' },
  WITHDRAWN: { label: 'Withdrawn', color: '#64748b' },
  OTHER: { label: 'Other', color: '#64748b' },
}

/**
 * Accent colour for a job row/card. Driven purely by `status` — the mock data had a separate
 * `outcome` field on the job, but the backend keeps Outcome on interview rounds, and
 * OFFER/REJECTED already carry the same meaning.
 */
export function getStatusAccent(status) {
  if (status === 'OFFER') return '#4ade9b'
  if (status === 'REJECTED') return '#fb7185'
  return null
}

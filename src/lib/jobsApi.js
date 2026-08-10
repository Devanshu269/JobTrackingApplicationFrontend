import { api } from './api'

/**
 * Job applications and interview rounds.
 *
 * Everything here is scoped to the logged-in user by the backend — no userId is ever sent, and
 * a job belonging to someone else returns 404 (never 403, so the API can't be used to probe
 * which ids exist). Treat a 404 as "not available to you", not as "definitely deleted".
 */

/** The exact set of fields the API accepts on POST/PUT. `jobId`, `createdAt`, `updatedAt` are server-owned. */
const JOB_REQUEST_FIELDS = [
  'companyName',
  'jobRole',
  'status',
  'priority',
  'jobUrl',
  'location',
  'jobType',
  'salaryRange',
  'recruiterName',
  'recruiterEmail',
  'recruiterPhone',
  'resumeUrl',
  'coverLetterUrl',
  'notes',
  'appliedDate',
  'followUpDate',
  'reminderEnabled',
]

/**
 * Builds a request body from a full job object.
 *
 * **This is what makes `PUT` safe.** The API's PUT is a full replace, not a patch: any field
 * left out of the body is written as null. So a partial edit — dragging a kanban card to change
 * only `status` — has to send everything else back untouched, or it silently wipes the notes,
 * salary and recruiter details. Always build this from the complete object you got from the
 * API, with your edits applied on top.
 *
 * Empty strings are normalised to null so a cleared text input stores as absent rather than "".
 */
export function toJobRequestBody(job) {
  const body = {}
  for (const field of JOB_REQUEST_FIELDS) {
    const value = job[field]
    body[field] = value === '' || value === undefined ? null : value
  }
  // NOT NULL in the database — the backend defaults a null, but being explicit costs nothing.
  body.reminderEnabled = Boolean(job.reminderEnabled)
  return body
}

/**
 * @param {{status?: string, priority?: string, jobType?: string, search?: string}} filters
 * Omitted or empty filters are left off the query string entirely. Results come back
 * newest-first from the server, so callers must not re-sort by date.
 */
export async function listJobs(filters = {}) {
  const params = { size: 100 } // Default to fetching up to 100 on one page
  for (const key of ['status', 'priority', 'jobType', 'search', 'page', 'size']) {
    const value = filters[key]
    if (value !== undefined && value !== '') params[key] = value
  }
  const { data } = await api.get('/api/jobs', { params })
  return data
}

export async function getJob(jobId) {
  const { data } = await api.get(`/api/jobs/${jobId}`)
  return data
}

export async function createJob(job) {
  const { data } = await api.post('/api/jobs', toJobRequestBody(job))
  return data
}

export async function updateJob(jobId, job) {
  const { data } = await api.put(`/api/jobs/${jobId}`, toJobRequestBody(job))
  return data
}

export async function patchJob(jobId, updates) {
  const { data } = await api.patch(`/api/jobs/${jobId}`, updates)
  return data
}

export async function deleteJob(jobId) {
  await api.delete(`/api/jobs/${jobId}`)
}

/** `{ total, byStatus: { WISHLIST, APPLIED, INTERVIEW, OFFER, REJECTED } }` — always zero-filled. */
export async function getJobStats() {
  const { data } = await api.get('/api/jobs/stats')
  return data
}

export async function getJobTrend(days = 7) {
  const { data } = await api.get('/api/jobs/trend', { params: { days } })
  return data
}

export async function getNotifications() {
  const { data } = await api.get('/api/notifications')
  return data
}

// ---- Interview rounds -------------------------------------------------------------------

export async function listRounds(jobId) {
  const { data } = await api.get(`/api/jobs/${jobId}/rounds`)
  return data
}

export async function createRound(jobId, round) {
  const { data } = await api.post(`/api/jobs/${jobId}/rounds`, round)
  return data
}

export async function updateRound(jobId, roundId, round) {
  const { data } = await api.put(`/api/jobs/${jobId}/rounds/${roundId}`, round)
  return data
}

export async function deleteRound(jobId, roundId) {
  await api.delete(`/api/jobs/${jobId}/rounds/${roundId}`)
}

/**
 * Every scheduled round across all of the user's jobs, soonest first, each carrying its
 * company and role. One request — building this from `/api/jobs/{id}/rounds` would be an N+1.
 */
export async function listUpcomingRounds() {
  const { data } = await api.get('/api/rounds/upcoming')
  return data
}

// ---- Activity log ------------------------------------------------------------------------

/**
 * Real append-only audit trail. Replaces the derived feed from `buildActivityFeed()`.
 * Paginated natively by the backend via `page` and `size`.
 */
export async function listActivity(page = 0, size = 25) {
  const { data } = await api.get('/api/activity', { params: { page, size } })
  return data
}

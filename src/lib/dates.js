/**
 * Conversions between the API's `LocalDateTime` strings and what `<input>` elements produce.
 *
 * The API sends and accepts `"2026-08-01T10:00:00"` — no timezone, no trailing `Z`. It is a
 * wall-clock time with no offset attached, which is exactly why these helpers are all string
 * surgery rather than `Date` arithmetic.
 *
 * The trap: `new Date('2026-08-01')` parses as **UTC midnight**, while
 * `new Date('2026-08-01T00:00:00')` parses as **local midnight**. Round-tripping a date through
 * a `Date` object and back can therefore shift it by a day for anyone west of UTC. So the
 * send path never constructs a `Date` at all.
 */

/** `"2026-08-01"` (from `<input type="date">`) → `"2026-08-01T00:00:00"`. Empty → null. */
export function toApiDateTime(dateValue) {
  if (!dateValue) return null
  // Already a full date-time (e.g. an untouched value read back from the API) — pass through.
  if (dateValue.includes('T')) return dateValue
  return `${dateValue}T00:00:00`
}

/** `"2026-08-01T10:00:00"` → `"2026-08-01"` for `<input type="date">`. */
export function toDateInputValue(apiDateTime) {
  if (!apiDateTime) return ''
  return apiDateTime.slice(0, 10)
}

/**
 * Applies a `<input type="date">` value to an existing API date-time, keeping the original
 * clock time when the calendar day hasn't changed.
 *
 * A date input can only express a day, so naively round-tripping one would rewrite a job
 * applied at `T10:00:00` to `T00:00:00` the first time anyone edited an unrelated field.
 * Preserving the time makes the date input non-destructive.
 */
export function mergeDateIntoDateTime(dateValue, originalDateTime) {
  if (!dateValue) return null
  if (originalDateTime && originalDateTime.slice(0, 10) === dateValue) return originalDateTime
  return `${dateValue}T00:00:00`
}

/** `"2026-08-15T14:00:00"` → `"2026-08-15T14:00"` for `<input type="datetime-local">`. */
export function toDateTimeInputValue(apiDateTime) {
  if (!apiDateTime) return ''
  return apiDateTime.slice(0, 16)
}

/** `"2026-08-15T14:00"` (from `<input type="datetime-local">`) → `"2026-08-15T14:00:00"`. */
export function toApiDateTimeFromLocal(value) {
  if (!value) return null
  return value.length === 16 ? `${value}:00` : value
}

/**
 * Parses an API date-time into a `Date` for *display only*.
 * Appends a time component when absent so the string is read as local, not UTC.
 */
function parseApi(apiDateTime) {
  if (!apiDateTime) return null
  const withTime = apiDateTime.includes('T') ? apiDateTime : `${apiDateTime}T00:00:00`
  const d = new Date(withTime)
  return Number.isNaN(d.getTime()) ? null : d
}

/** `"2026-08-01T10:00:00"` → `"Aug 1, 2026"`. Returns the fallback when null. */
export function formatDate(apiDateTime, fallback = '—') {
  const d = parseApi(apiDateTime)
  if (!d) return fallback
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** `"2026-08-01T10:00:00"` → `"Aug 1"`. Compact form for cards. */
export function formatDateShort(apiDateTime, fallback = '') {
  const d = parseApi(apiDateTime)
  if (!d) return fallback
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** `"2026-08-15T14:00:00"` → `"Aug 15, 2:00 PM"`. */
export function formatDateTime(apiDateTime, fallback = '—') {
  const d = parseApi(apiDateTime)
  if (!d) return fallback
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString(
    'en-US',
    { hour: 'numeric', minute: '2-digit' },
  )}`
}

/** `"2026-08-08T14:30:00"` → `"Just now"` / `"3h ago"` / `"2d ago"` / `"Aug 3"`. */
export function formatRelative(apiDateTime, fallback = '') {
  const d = parseApi(apiDateTime)
  if (!d) return fallback

  const diffMs = Date.now() - d.getTime()
  // A server clock a second or two ahead shouldn't render as "in -1h".
  if (diffMs < 60_000) return 'Just now'

  const diffMinutes = Math.floor(diffMs / 60_000)
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Local `YYYY-MM-DD` for a `Date` — never via `toISOString()`, which converts to UTC first. */
export function toLocalDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Buckets jobs into the last 7 days (oldest → today) by `appliedDate`, falling back to
 * `createdAt` for jobs never formally applied to.
 *
 * Derived client-side because the backend has no trend endpoint. Comparison is on the
 * `YYYY-MM-DD` prefix, so it never touches timezone conversion.
 */
export function buildWeeklyTrend(jobs, today = new Date()) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push({
      key: toLocalDateKey(d),
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      count: 0,
    })
  }

  const index = new Map(days.map((d) => [d.key, d]))
  for (const job of jobs) {
    const stamp = job.appliedDate || job.createdAt
    if (!stamp) continue
    const bucket = index.get(stamp.slice(0, 10))
    if (bucket) bucket.count += 1
  }
  return days
}

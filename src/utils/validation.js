/**
 * Client-side input checks. These exist to give fast feedback — the backend
 * remains the authority and its 400 response is what actually blocks a submit.
 */

// Deliberately a format check, not a provider allowlist. Restricting to
// gmail/yahoo/etc. would reject work addresses, which is most of this audience.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/

/** 'empty' | 'valid' | 'invalid' */
export function checkEmail(value) {
  const trimmed = value.trim()
  if (!trimmed) return 'empty'
  return EMAIL_RE.test(trimmed) ? 'valid' : 'invalid'
}

/**
 * Password policy for *setting* a password (signup, reset, change).
 *
 * The length rule is bounded at both ends on purpose. The backend enforces
 * `@Size(min = 8, max = 64)`, and a client rule with no ceiling is worse than no rule at all:
 * a 70-character passphrase would light up every checkmark, then come back as a 400 on a field
 * the form had just declared valid. The complexity rules below are client-only — the backend
 * has none — which is safe because stricter-on-the-client never produces a surprise rejection.
 */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 64

export const PASSWORD_RULES = [
  {
    id: 'length',
    label: `${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters`,
    test: (v) => v.length >= PASSWORD_MIN_LENGTH && v.length <= PASSWORD_MAX_LENGTH,
  },
  { id: 'case', label: 'Upper & lowercase', test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { id: 'number', label: 'A number', test: (v) => /\d/.test(v) },
  { id: 'symbol', label: 'A symbol', test: (v) => /[^A-Za-z0-9]/.test(v) },
]

/**
 * Returns which rules pass, a 0..1 score, and an overall status.
 * `met` is what the meter and the checklist both read from.
 */
export function checkPassword(value) {
  const met = PASSWORD_RULES.filter((rule) => rule.test(value)).map((rule) => rule.id)
  const score = met.length / PASSWORD_RULES.length
  if (!value) return { met, score: 0, status: 'empty', label: '' }
  // Length is non-negotiable; the rest raise the grade.
  const strong = met.includes('length') && met.length >= 3
  return {
    met,
    score,
    status: strong ? 'valid' : 'weak',
    label: met.length <= 1 ? 'Weak' : met.length === 2 ? 'Fair' : met.length === 3 ? 'Good' : 'Strong',
  }
}

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

export const PASSWORD_RULES = [
  { id: 'length', label: '8+ characters', test: (v) => v.length >= 8 },
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

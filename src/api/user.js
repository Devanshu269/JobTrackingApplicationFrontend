import { api } from '@/api/client'

/**
 * Profile and account endpoints. All return the updated `UserDto`, so callers can refresh
 * local user state straight from the response instead of re-fetching `/api/auth/me`.
 */

/**
 * Genuine partial update: only the fields you send are touched.
 *
 * Two traps here.
 *
 * 1. **The request field names differ from the response's.** You send `firstName`/`lastName`;
 *    `UserDto` comes back with `userFirstName`/`userLastName`. Sending `userFirstName` is not
 *    an error — it is silently ignored, and the update appears to do nothing.
 * 2. **Empty strings fail validation.** The fields carry `@Size(min = 3)` with no `@NotBlank`,
 *    so null means "leave alone" but `""` is a 400. Blank values are dropped below rather than
 *    forwarded.
 */
export async function updateProfile({ firstName, lastName, avatarUrl }) {
  const body = {}
  if (firstName?.trim()) body.firstName = firstName.trim()
  if (lastName?.trim()) body.lastName = lastName.trim()
  if (avatarUrl !== undefined) body.avatarUrl = avatarUrl
  const { data } = await api.put('/api/users/me', body)
  return data
}

/** `resumeUrl` is required and non-blank — use `clearDefaultResume()` to remove it. */
export async function setDefaultResume(resumeUrl) {
  const { data } = await api.put('/api/users/me/default-resume', { resumeUrl })
  return data
}

/**
 * Clearing needs its own verb: the set endpoint has `@NotBlank` on `resumeUrl`, so there is no
 * way to express "remove it" through a PUT. Returns the updated `UserDto`, not a 204.
 */
export async function clearDefaultResume() {
  const { data } = await api.delete('/api/users/me/default-resume')
  return data
}

/** 204 on success. 401 both for a wrong current password and for a non-LOCAL account. */
export async function changePassword({ currentPassword, newPassword }) {
  await api.post('/api/auth/change-password', { currentPassword, newPassword })
}

export async function updatePreferences(preferences) {
  const { data } = await api.patch('/api/users/me/preferences', preferences)
  return data
}

/**
 * Fallback user profile used when the real /api/auth/me endpoint is not
 * available (e.g. when developing without the backend running).
 * AuthContext.user takes priority when a real session exists.
 */

export const MOCK_USER = {
  userId: 1,
  userFirstName: 'Alex',
  userLastName: 'Johnson',
  email: 'alex.johnson@example.com',
  avatarUrl: null,
  provider: 'LOCAL',
}

const TOKEN_KEY = 'jt_token'
const REFRESH_TOKEN_KEY = 'jt_refreshToken'
const USER_ID_KEY = 'jt_userId'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens({ token, refreshToken, userId }) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  if (userId) localStorage.setItem(USER_ID_KEY, String(userId))
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_ID_KEY)
}

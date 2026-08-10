import axios from 'axios'
import { getToken, getRefreshToken, setTokens, clearTokens } from './tokenStorage'

const baseURL = import.meta.env.VITE_API_BASE_URL

export const api = axios.create({ baseURL })

// Endpoints that must never trigger a token refresh: they either take no auth at
// all, or they are the token-management calls themselves (refreshing on their 401
// would recurse). Everything else — including /api/auth/me — is allowed to refresh,
// which is what lets a returning user with a live refresh token skip the login page.
const NO_REFRESH_PATHS = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/refresh',
  '/api/auth/oauth/exchange',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/logout',
]

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise = null

async function requestNewAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token available')

  const { data } = await axios.post(`${baseURL}/api/auth/refresh`, { refreshToken })
  // Rotating refresh: `refreshToken` is a NEW value and the one just sent is dead.
  // Fall back to the existing one only defensively — it should always be present.
  setTokens({ token: data.token, refreshToken: data.refreshToken ?? refreshToken })
  return data.token
}

// Concurrent 401s share a single in-flight refresh instead of stampeding the endpoint.
function refreshAccessToken() {
  refreshPromise =
    refreshPromise ??
    requestNewAccessToken().finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error
    const skipRefresh = NO_REFRESH_PATHS.some((path) => config?.url?.includes(path))

    if (response?.status === 401 && !config._retry && !skipRefresh) {
      config._retry = true
      try {
        const token = await refreshAccessToken()
        config.headers.Authorization = `Bearer ${token}`
        return api(config)
      } catch (refreshError) {
        // Refresh token is gone/expired/revoked — drop the session and let the
        // router send them to /login. No hard redirect: it would blow away
        // in-flight React state and can loop while already on a public page.
        clearTokens()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.message || fallback
}

/**
 * The field-name → message map from a 400, or null.
 *
 * Populated for two different failure modes, which is worth knowing because they carry
 * different top-level messages:
 *   - bean validation  → `message: "Validation failed"`,      e.g. `{ password: "…8 and 64…" }`
 *   - unparseable enum → `message: "Malformed request body"`, e.g.
 *     `{ status: "Invalid value 'NOT_A_STATUS'. Expected one of: [WISHLIST, …]" }`
 *
 * Still returns null for a 401/404/409 or a body Spring couldn't attribute to a field, so
 * callers must fall back to the top-level message rather than assume a map is present.
 */
export function getApiFieldErrors(error) {
  const errors = error?.response?.data?.errors
  return errors && typeof errors === 'object' ? errors : null
}

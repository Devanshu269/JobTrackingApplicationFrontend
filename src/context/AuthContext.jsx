/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '@/api/client'
import { getRefreshToken, getToken, setTokens, clearTokens } from '@/utils/tokenStorage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    // A refresh token alone is enough to restore a session: /me will 401 on the
    // stale access token and the response interceptor swaps in a fresh one.
    if (!getToken() && !getRefreshToken()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const { data } = await api.get('/api/auth/me')
      setUser(data)
    } catch {
      clearTokens()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  async function login(email, password) {
    const { data } = await api.post('/api/auth/login', { email, password })
    setTokens(data)
    await loadUser()
  }

  async function signup(userFirstName, userLastName, email, password) {
    const { data } = await api.post('/api/auth/signup', {
      userFirstName,
      userLastName,
      email,
      password,
    })
    setTokens(data)
    await loadUser()
  }

  async function exchangeOAuthCode(code) {
    const { data } = await api.post('/api/auth/oauth/exchange', { code })
    setTokens(data)
    await loadUser()
  }

  async function logout() {
    const refreshToken = getRefreshToken()
    try {
      if (refreshToken) await api.post('/api/auth/logout', { refreshToken })
    } finally {
      clearTokens()
      setUser(null)
    }
  }

  async function logoutAll() {
    try {
      await api.post('/api/auth/logout-all')
    } finally {
      clearTokens()
      setUser(null)
    }
  }

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    signup,
    exchangeOAuthCode,
    logout,
    logoutAll,
    refreshUser: loadUser,
    // Every /api/users/me* endpoint returns the updated UserDto, so callers can push it
    // straight into context instead of paying for another /me round trip.
    applyUser: setUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

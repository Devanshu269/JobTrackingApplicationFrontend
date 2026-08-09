import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute, PublicOnlyRoute, RootRedirect } from './components/RouteGuards'
import { ScrollToHash } from './components/ScrollToHash'
import { AppShell } from './components/AppShell'
import LoginPage from './pages/LoginPage'
import ExplorePage from './pages/ExplorePage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import OAuthRedirectPage from './pages/OAuthRedirectPage'
import DashboardPage from './pages/DashboardPage'
import ApplicationsPage from './pages/ApplicationsPage'
import JobDetailPage from './pages/JobDetailPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ScrollToHash />
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/oauth2/redirect" element={<OAuthRedirectPage />} />

            {/* Protected app routes under /JobJuggler */}
            <Route
              path="/JobJuggler"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="applications" element={<ApplicationsPage />} />
              <Route path="applications/:jobId" element={<JobDetailPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Backward compat: old /dashboard → new route */}
            <Route path="/dashboard" element={<Navigate to="/JobJuggler/dashboard" replace />} />

            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

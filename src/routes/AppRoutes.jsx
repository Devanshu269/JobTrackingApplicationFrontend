import { lazy, Suspense } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute, RootRedirect } from '@/routes/RouteGuards'
import { FullPageSpinner } from '@/components/ui/Spinner'

/**
 * Every route is code-split. The entry bundle then carries only the router,
 * auth context and shell chrome — a visitor landing on /explore never downloads
 * the dashboard, and vice versa.
 *
 * Pages are default exports; AppShell is named, hence the `.then` mapping that
 * `lazy()` needs to find a `default` key.
 */
const AppShell = lazy(() => import('@/layouts/AppShell').then((m) => ({ default: m.AppShell })))

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const ExplorePage = lazy(() => import('@/pages/ExplorePage'))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))
const OAuthRedirectPage = lazy(() => import('@/pages/OAuthRedirectPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ApplicationsPage = lazy(() => import('@/pages/ApplicationsPage'))
const JobDetailPage = lazy(() => import('@/pages/JobDetailPage'))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'))
const ActivityPage = lazy(() => import('@/pages/ActivityPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))

export function AppRoutes() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
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
          <Route path="activity" element={<ActivityPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Backward compat: old /dashboard → new route */}
        <Route path="/dashboard" element={<Navigate to="/JobJuggler/dashboard" replace />} />

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  )
}

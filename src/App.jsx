import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute, PublicOnlyRoute, RootRedirect } from './components/RouteGuards'
import { ScrollToHash } from './components/ScrollToHash'
import LoginPage from './pages/LoginPage'
import ExplorePage from './pages/ExplorePage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import OAuthRedirectPage from './pages/OAuthRedirectPage'
import DashboardPage from './pages/DashboardPage'

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
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

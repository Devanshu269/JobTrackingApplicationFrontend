import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { ScrollToHash } from '@/routes/ScrollToHash'
import { AppRoutes } from '@/routes/AppRoutes'

/** Composition root: error boundary → router → auth, then the route table. */
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ScrollToHash />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

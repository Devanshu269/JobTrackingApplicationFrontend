import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import { configError } from '@/config/env'
import App from '@/app/App'
import { ConfigError } from '@/app/ConfigError'

const root = createRoot(document.getElementById('root'))

// A build missing its API URL can't do anything useful, and every symptom downstream is
// misleading (404s that look like a dead backend). Say so plainly instead.
root.render(
  <StrictMode>{configError ? <ConfigError message={configError} /> : <App />}</StrictMode>,
)

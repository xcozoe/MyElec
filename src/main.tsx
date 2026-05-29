import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DialogProvider } from './components/Dialogs'
import { SettingsProvider } from './context/SettingsContext'
import { AuthProvider } from './context/AuthContext'

// AuthProvider est plus haut que SettingsProvider et DialogProvider : il
// expose le token via setAuthTokenProvider à storage.ts, et tout fetch métier
// (chargé par useStore en aval) doit voir le token en place.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <SettingsProvider>
          <DialogProvider>
            <App />
          </DialogProvider>
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DialogProvider } from './components/Dialogs'
import { SettingsProvider } from './context/SettingsContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <SettingsProvider>
        <DialogProvider>
          <App />
        </DialogProvider>
      </SettingsProvider>
    </ErrorBoundary>
  </StrictMode>,
)

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    // Une valeur lancée n'est pas forcément une Error (on peut throw une
    // string, un objet…). On normalise pour garantir `.message`.
    return {
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    console.error('[MyElec] Erreur dans le rendu :', error, info)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset)
      }
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-5">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">
              Oups — l'interface a planté
            </h2>
            <p className="mt-2 text-sm text-red-800 dark:text-red-300">
              Tes données sont sauvegardées dans <code>data/*.json</code>.
              Cette erreur n'a rien cassé côté disque.
            </p>
            <pre className="mt-3 text-xs bg-white dark:bg-slate-950 rounded p-2 overflow-x-auto border border-red-200 dark:border-red-900">
              {this.state.error.message}
            </pre>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  this.reset()
                  window.location.reload()
                }}
                className="rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-1.5 text-sm"
              >
                Recharger l'app
              </button>
              <button
                onClick={this.reset}
                className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm"
              >
                Tenter de continuer
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

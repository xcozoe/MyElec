import type { Store } from '../hooks/useStore'
import { PowerBalance } from './PowerBalance'

/**
 * Page « Bilan » : vue d'ensemble synthétique de l'installation. Démarre avec
 * le bilan de puissance par phase ; pensée pour être enrichie (équilibre global
 * des phases, alertes saisonnières piscine, simulation de charges…).
 */
export function BilanView({ store }: { store: Store }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Bilan
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Synthèse de l'installation. D'autres indicateurs viendront s'ajouter.
        </p>
      </div>
      <PowerBalance store={store} />
    </div>
  )
}

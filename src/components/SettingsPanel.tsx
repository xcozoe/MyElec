import {
  DEFAULT_PHASE_COLORS,
  PHASE_COLOR_KEYS,
  useSettings,
  type PhaseColorKey,
} from '../context/SettingsContext'
import { PHASE_STYLES } from '../utils/phaseStyle'

const PHASE_LABELS: Record<PhaseColorKey, string> = {
  L1: 'Phase 1 (L1)',
  L2: 'Phase 2 (L2)',
  L3: 'Phase 3 (L3)',
  TRI: 'Triphasé (TRI)',
  inconnue: 'Phase inconnue',
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { phaseColors, setPhaseColor, resetPhaseColors } = useSettings()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Paramètres</h3>
        <button
          onClick={onClose}
          className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5"
        >
          Fermer
        </button>
      </div>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            Couleurs des phases
          </h4>
          <button
            onClick={() => {
              if (confirm('Restaurer les couleurs par défaut ?')) resetPhaseColors()
            }}
            className="text-xs rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Réinitialiser
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Modification appliquée en direct dans toute l'app (cartes, badges,
          listes…). Persisté localement sur cet appareil.
        </p>

        <ul className="space-y-2">
          {PHASE_COLOR_KEYS.map((key) => {
            const style = PHASE_STYLES[key]
            const value = phaseColors[key]
            const isDefault = value.toLowerCase() === DEFAULT_PHASE_COLORS[key].toLowerCase()
            return (
              <li
                key={key}
                className="flex items-center gap-3 rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-900"
              >
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style.ring} ${style.bg} ${style.text}`}
                >
                  <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                  {style.label}
                </span>
                <div className="flex-1">
                  <div className="text-sm">{PHASE_LABELS[key]}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {value}
                    {!isDefault && (
                      <button
                        onClick={() =>
                          setPhaseColor(key, DEFAULT_PHASE_COLORS[key])
                        }
                        className="ml-2 underline decoration-dotted hover:opacity-80"
                        title={`Restaurer la couleur d'origine (${DEFAULT_PHASE_COLORS[key]})`}
                      >
                        défaut
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="color"
                  value={value}
                  onChange={(e) => setPhaseColor(key, e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-slate-300 dark:border-slate-700 bg-transparent"
                  aria-label={`Couleur ${PHASE_LABELS[key]}`}
                />
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

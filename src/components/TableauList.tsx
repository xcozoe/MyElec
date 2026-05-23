import type { Tableau } from '../types/electrical'
import { PHASE_STYLES } from '../utils/phaseStyle'

function countDisjoncteurs(t: Tableau) {
  return t.rangees.reduce((acc, r) => acc + r.disjoncteurs.length, 0)
}

function countLibresOuInconnus(t: Tableau) {
  let n = 0
  for (const r of t.rangees) {
    for (const d of r.disjoncteurs) {
      if (d.statut === 'libre' || d.phase_affectation === 'inconnue') n++
    }
  }
  return n
}

export function TableauList({
  tableaux,
  onOpen,
}: {
  tableaux: Tableau[]
  onOpen: (id: string) => void
}) {
  const byId = new Map(tableaux.map((t) => [t.id, t]))
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-1">
        Tableaux électriques
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        {tableaux.length} tableau{tableaux.length > 1 ? 'x' : ''} référencé
        {tableaux.length > 1 ? 's' : ''}. Cliquez sur une carte pour ouvrir le
        détail.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {tableaux.map((t) => {
          const parent = t.parent_tableau_id
            ? byId.get(t.parent_tableau_id)
            : undefined
          const disjoncteursCount = countDisjoncteurs(t)
          const aIdentifier = countLibresOuInconnus(t)
          const phaseStyle = PHASE_STYLES[t.arrivee_phases ?? 'inconnue']
          return (
            <button
              key={t.id}
              onClick={() => onOpen(t.id)}
              className="text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{t.nom}</h2>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {t.emplacement}
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 ring-inset ${phaseStyle.ring} ${phaseStyle.bg} ${phaseStyle.text}`}
                >
                  <span className={`h-2 w-2 rounded-full ${phaseStyle.dot}`} />
                  {t.alimentation === 'triphase' ? 'Triphasé' : 'Monophasé'}
                  {t.alimentation === 'monophase' && t.arrivee_phases
                    ? ` · ${t.arrivee_phases}`
                    : ''}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <Stat label="Rangées" value={t.rangees.length} />
                <Stat label="Disjoncteurs" value={disjoncteursCount} />
                <Stat
                  label="À identifier"
                  value={aIdentifier}
                  hint={aIdentifier > 0 ? 'libres / inconnus' : undefined}
                />
              </div>

              {parent && (
                <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                  Alimenté depuis{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {parent.nom}
                  </span>
                  {t.parent_disjoncteur_id && (
                    <>
                      {' '}
                      · disjoncteur{' '}
                      <code className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">
                        {t.parent_disjoncteur_id}
                      </code>
                    </>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint?: string
}) {
  return (
    <div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      {hint && (
        <div className="text-[10px] text-slate-400 dark:text-slate-500">
          {hint}
        </div>
      )}
    </div>
  )
}

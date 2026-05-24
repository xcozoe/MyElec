import { useMemo } from 'react'
import type { Store } from '../hooks/useStore'
import type { Disjoncteur, Tableau } from '../types/electrical'
import { PHASE_STYLES } from '../utils/phaseStyle'

interface Props {
  store: Store
  onOpenTableau: (tableauId: string, focusDisjoncteurId?: string) => void
}

/**
 * Vue haut niveau du cheminement électrique : Linky → Itron → tableau
 * racine, puis cascade des tableaux enfants (chaque branche étiquetée
 * avec le disjoncteur qui assure la jonction). Le contenu détaillé de
 * chaque tableau (rangées, disjoncteurs internes) n'apparaît PAS ici —
 * pour le voir, on tape sur la carte du tableau, ce qui ouvre la vue
 * détail existante (drill-down).
 */
export function CheminementView({ store, onOpenTableau }: Props) {
  const root = useMemo(
    () => store.tableaux.find((t) => !t.parent_tableau_id),
    [store.tableaux],
  )

  if (!root) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Aucun tableau racine trouvé.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Cheminement électrique
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Vue d'ensemble : suit l'arrivée Enedis jusqu'à chaque tableau. Tape
          sur une carte pour voir ses disjoncteurs, ou sur une jonction pour
          ouvrir le disjoncteur source.
        </p>
      </div>

      <div className="space-y-3">
        <SourceNode label="Linky" sub="Compteur Enedis 18 kVA triphasé" />
        <VerticalLink />
        <SourceNode
          label="Itron 30 A / phase"
          sub="Disjoncteur de branchement 4P 500 mA sélectif (coffret extérieur, ~150 m du tableau principal)"
        />
        <VerticalLink />
        <TableauBranch tableau={root} store={store} onOpenTableau={onOpenTableau} />
      </div>
    </div>
  )
}

// ----- Sources externes -----

function SourceNode({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2 max-w-md">
      <div className="text-sm font-semibold">⚡ {label}</div>
      {sub && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          {sub}
        </div>
      )}
    </div>
  )
}

function VerticalLink() {
  return (
    <div
      className="h-4 w-px bg-slate-400 dark:bg-slate-600 ml-4"
      aria-hidden
    />
  )
}

// ----- Branche tableau + enfants -----

function TableauBranch({
  tableau,
  store,
  onOpenTableau,
}: {
  tableau: Tableau
  store: Store
  onOpenTableau: (tableauId: string, focusDisjoncteurId?: string) => void
}) {
  const childTableaux = store.tableaux.filter(
    (t) => t.parent_tableau_id === tableau.id,
  )

  return (
    <div>
      <TableauCard
        tableau={tableau}
        onClick={() => onOpenTableau(tableau.id)}
      />

      {childTableaux.length > 0 && (
        <div className="ml-4 mt-2 pl-4 border-l-2 border-slate-400 dark:border-slate-600 space-y-3">
          {childTableaux.map((child) => {
            const sourceDj = findDisjoncteur(
              tableau,
              child.parent_disjoncteur_id,
            )
            return (
              <div key={child.id}>
                {sourceDj && (
                  <JunctionRow
                    parentTableau={tableau}
                    disjoncteur={sourceDj}
                    onClick={() => onOpenTableau(tableau.id, sourceDj.id)}
                  />
                )}
                <TableauBranch
                  tableau={child}
                  store={store}
                  onOpenTableau={onOpenTableau}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function findDisjoncteur(
  tableau: Tableau,
  djId: string | undefined,
): Disjoncteur | undefined {
  if (!djId) return undefined
  for (const r of tableau.rangees) {
    const d = r.disjoncteurs.find((x) => x.id === djId)
    if (d) return d
  }
  return undefined
}

// ----- Carte tableau (haute densité d'info, minimale) -----

function TableauCard({
  tableau,
  onClick,
}: {
  tableau: Tableau
  onClick: () => void
}) {
  const phaseStyle = PHASE_STYLES[tableau.arrivee_phases ?? 'inconnue']
  const nbDj = tableau.rangees.reduce(
    (acc, r) => acc + r.disjoncteurs.length,
    0,
  )
  return (
    <button
      onClick={onClick}
      className={`w-full max-w-xl text-left rounded-lg ring-2 ring-inset ${phaseStyle.ring} ${phaseStyle.bg} px-4 py-3 hover:shadow transition`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${phaseStyle.ring} ${phaseStyle.bg} ${phaseStyle.text}`}
        >
          <span className={`h-2 w-2 rounded-full ${phaseStyle.dot}`} />
          {tableau.alimentation === 'triphase' ? 'Triphasé' : 'Monophasé'}
          {tableau.alimentation === 'monophase' && tableau.arrivee_phases
            ? ` · ${tableau.arrivee_phases}`
            : ''}
        </span>
        <h2 className="text-base font-semibold flex-1">📦 {tableau.nom}</h2>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Voir disjoncteurs →
        </span>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        {tableau.emplacement} · {tableau.rangees.length} rangée
        {tableau.rangees.length > 1 ? 's' : ''} · {nbDj} disjoncteur
        {nbDj > 1 ? 's' : ''}
      </div>
    </button>
  )
}

// ----- Jonction (disjoncteur entre deux tableaux) -----

function JunctionRow({
  parentTableau,
  disjoncteur,
  onClick,
}: {
  parentTableau: Tableau
  disjoncteur: Disjoncteur
  onClick: () => void
}) {
  const phaseStyle = PHASE_STYLES[disjoncteur.phase_affectation]
  const isBornier = disjoncteur.type_protection === 'bornier_repartition'

  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-slate-500 dark:text-slate-400 text-xs">⏬</span>
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs ring-1 ring-inset ${phaseStyle.ring} ${phaseStyle.bg} ${phaseStyle.text} hover:shadow`}
        title={`Dans ${parentTableau.nom}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${phaseStyle.dot}`} />
        <span className="font-mono">{disjoncteur.id}</span>
        <span className="opacity-90">— {disjoncteur.etiquette}</span>
        {isBornier && (
          <span className="text-[9px] uppercase rounded bg-slate-200 dark:bg-slate-700 px-1 py-0.5">
            Bornier
          </span>
        )}
        <span className="text-[10px] font-mono opacity-60">
          {disjoncteur.calibre}
        </span>
      </button>
    </div>
  )
}

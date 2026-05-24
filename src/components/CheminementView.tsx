import { useMemo } from 'react'
import type { Store } from '../hooks/useStore'
import type {
  Disjoncteur,
  Rangee,
  Tableau,
} from '../types/electrical'
import { PHASE_STYLES } from '../utils/phaseStyle'

interface Props {
  store: Store
  onOpenTableau: (tableauId: string, focusDisjoncteurId?: string) => void
}

/**
 * Schéma haut niveau : Linky → Itron → tableau racine, puis chaque
 * tableau enfant est rendu SOUS son parent (légèrement indenté), comme
 * une boîte autonome avec un badge « alimenté depuis [disjoncteur source] »
 * en haut. À l'intérieur d'un tableau, on affiche uniquement ses
 * disjoncteurs internes — pas les sous-tableaux — pour garder la
 * lecture aérée.
 */
export function CheminementView({ store, onOpenTableau }: Props) {
  const rootTableau = useMemo(
    () => store.tableaux.find((t) => !t.parent_tableau_id),
    [store.tableaux],
  )

  if (!rootTableau) {
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
          Vue d'ensemble de la chaîne d'alimentation. Tape sur un tableau ou un
          disjoncteur pour ouvrir le détail.
        </p>
      </div>

      <div className="flex flex-col items-center gap-0">
        <ExternalSource label="Linky" sub="Compteur Enedis 18 kVA triphasé" />
        <Connector />
        <ExternalSource
          label="Itron 30 A / phase"
          sub="Disjoncteur de branchement 4P 500 mA sélectif (coffret extérieur)"
        />
        <Connector />
        <TableauBranch
          tableau={rootTableau}
          store={store}
          onOpenTableau={onOpenTableau}
          depth={0}
        />
      </div>

      <div className="mt-8 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-slate-300 dark:bg-slate-600" />
          Bornier (passif)
        </span>
        <span className="mx-3">·</span>
        <span>
          Cascade déduite de <code>differentiel_parent_id</code>,{' '}
          <code>parent_tableau_id</code> et <code>parent_disjoncteur_id</code>.
        </span>
      </div>
    </div>
  )
}

// ----- Composants internes -----

function ExternalSource({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2 text-center">
      <div className="text-sm font-semibold">⚡ {label}</div>
      {sub && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          {sub}
        </div>
      )}
    </div>
  )
}

function Connector({ height = 24 }: { height?: number }) {
  return (
    <div
      className="w-px bg-slate-400 dark:bg-slate-600"
      style={{ height }}
      aria-hidden
    />
  )
}

/**
 * Rend une "branche" : un tableau et ses tableaux enfants directement
 * en dessous (indentés).
 */
function TableauBranch({
  tableau,
  store,
  onOpenTableau,
  depth,
}: {
  tableau: Tableau
  store: Store
  onOpenTableau: (tableauId: string, focusDisjoncteurId?: string) => void
  depth: number
}) {
  const childTableaux = store.tableaux.filter(
    (t) => t.parent_tableau_id === tableau.id,
  )

  return (
    <div className="w-full max-w-3xl">
      <TableauBox
        tableau={tableau}
        store={store}
        onOpenTableau={onOpenTableau}
      />

      {childTableaux.length > 0 && (
        <div className="mt-3 ml-6 pl-4 border-l-2 border-slate-300 dark:border-slate-700 space-y-3">
          {childTableaux.map((child) => (
            <TableauBranch
              key={child.id}
              tableau={child}
              store={store}
              onOpenTableau={onOpenTableau}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Rend une boîte tableau avec son contenu interne (disjoncteurs en
 * cascade), SANS les sous-tableaux (qui sont rendus séparément par
 * TableauBranch).
 */
function TableauBox({
  tableau,
  store,
  onOpenTableau,
}: {
  tableau: Tableau
  store: Store
  onOpenTableau: (tableauId: string, focusDisjoncteurId?: string) => void
}) {
  const phaseStyle = PHASE_STYLES[tableau.arrivee_phases ?? 'inconnue']

  // Source disjoncteur (badge "alimenté depuis ...")
  const sourceDj = useMemo(() => {
    if (!tableau.parent_disjoncteur_id) return undefined
    for (const t of store.tableaux) {
      for (const r of t.rangees) {
        const d = r.disjoncteurs.find(
          (x) => x.id === tableau.parent_disjoncteur_id,
        )
        if (d) return { tableau: t, disjoncteur: d }
      }
    }
    return undefined
  }, [store.tableaux, tableau.parent_disjoncteur_id])

  // Roots internes = disjoncteurs sans differentiel_parent_id ou dont
  // le parent est hors de ce tableau.
  const allIds = new Set<string>()
  for (const r of tableau.rangees)
    for (const d of r.disjoncteurs) allIds.add(d.id)
  const roots: { rangee: Rangee; disjoncteur: Disjoncteur }[] = []
  for (const r of tableau.rangees) {
    for (const d of r.disjoncteurs) {
      const parent = d.differentiel_parent_id
      if (!parent || !allIds.has(parent)) {
        roots.push({ rangee: r, disjoncteur: d })
      }
    }
  }
  roots.sort((a, b) =>
    a.rangee.numero !== b.rangee.numero
      ? a.rangee.numero - b.rangee.numero
      : a.disjoncteur.position - b.disjoncteur.position,
  )

  return (
    <div
      className={`rounded-lg ring-2 ring-inset ${phaseStyle.ring} ${phaseStyle.bg} px-4 py-3 w-full`}
    >
      {sourceDj && (
        <div className="-mt-1 mb-2 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <span aria-hidden>⏎</span>
          <span>
            Alimenté depuis{' '}
            <button
              onClick={() =>
                onOpenTableau(sourceDj.tableau.id, sourceDj.disjoncteur.id)
              }
              className="font-mono underline decoration-dotted hover:opacity-80"
            >
              {sourceDj.disjoncteur.id}
            </button>{' '}
            ({sourceDj.disjoncteur.etiquette}) — dans {sourceDj.tableau.nom}
          </span>
        </div>
      )}

      <button
        onClick={() => onOpenTableau(tableau.id)}
        className="w-full text-left hover:opacity-80"
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
          <h2 className="text-base sm:text-lg font-semibold flex-1">
            📦 {tableau.nom}
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Ouvrir →
          </span>
        </div>
      </button>

      {roots.length > 0 && (
        <div className="mt-3 space-y-3">
          {roots.map(({ disjoncteur }) => (
            <DisjoncteurSubtree
              key={disjoncteur.id}
              tableau={tableau}
              disjoncteur={disjoncteur}
              store={store}
              onOpen={(djId) => onOpenTableau(tableau.id, djId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DisjoncteurSubtree({
  tableau,
  disjoncteur,
  store,
  onOpen,
}: {
  tableau: Tableau
  disjoncteur: Disjoncteur
  store: Store
  onOpen: (disjoncteurId: string) => void
}) {
  const children: { rangee: Rangee; disjoncteur: Disjoncteur }[] = []
  for (const r of tableau.rangees) {
    for (const d of r.disjoncteurs) {
      if (d.differentiel_parent_id === disjoncteur.id) {
        children.push({ rangee: r, disjoncteur: d })
      }
    }
  }
  children.sort((a, b) =>
    a.rangee.numero !== b.rangee.numero
      ? a.rangee.numero - b.rangee.numero
      : a.disjoncteur.position - b.disjoncteur.position,
  )

  // Existe-t-il un tableau enfant rattaché à ce disjoncteur ? Si oui, on
  // affiche une pastille « → [nom du tableau] » à côté.
  const childTableau = store.tableaux.find(
    (t) => t.parent_disjoncteur_id === disjoncteur.id,
  )

  const leafChildren = children.filter(
    (c) =>
      !tableau.rangees.some((r) =>
        r.disjoncteurs.some(
          (d) => d.differentiel_parent_id === c.disjoncteur.id,
        ),
      ),
  )
  const nonLeafChildren = children.filter((c) => !leafChildren.includes(c))
  const groupLeaves = leafChildren.length >= 4

  return (
    <div>
      <DisjoncteurChip
        disjoncteur={disjoncteur}
        childTableau={childTableau}
        onClick={() => onOpen(disjoncteur.id)}
      />

      {children.length > 0 && (
        <div className="mt-2 ml-4 pl-4 border-l-2 border-slate-300 dark:border-slate-700 space-y-3">
          {nonLeafChildren.map(({ disjoncteur: d }) => (
            <DisjoncteurSubtree
              key={d.id}
              tableau={tableau}
              disjoncteur={d}
              store={store}
              onOpen={onOpen}
            />
          ))}

          {groupLeaves ? (
            <LeavesGroup
              leaves={leafChildren.map((c) => c.disjoncteur)}
              onOpen={onOpen}
            />
          ) : (
            leafChildren.map(({ disjoncteur: d }) => (
              <DisjoncteurSubtree
                key={d.id}
                tableau={tableau}
                disjoncteur={d}
                store={store}
                onOpen={onOpen}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function DisjoncteurChip({
  disjoncteur,
  childTableau,
  onClick,
}: {
  disjoncteur: Disjoncteur
  childTableau?: Tableau
  onClick: () => void
}) {
  const phaseStyle = PHASE_STYLES[disjoncteur.phase_affectation]
  const isBornier = disjoncteur.type_protection === 'bornier_repartition'
  const isDiff =
    disjoncteur.type_protection === 'differentiel_tete_tableau' ||
    disjoncteur.type_protection === 'differentiel_tete_rangee' ||
    disjoncteur.type_protection === 'differentiel_dedie' ||
    disjoncteur.type_protection === 'disjoncteur_diff_dedie'

  return (
    <button
      onClick={onClick}
      className={`w-full text-left inline-flex flex-wrap items-center gap-2 rounded-md px-3 py-1.5 text-sm ring-1 ring-inset ${phaseStyle.ring} ${phaseStyle.bg} ${phaseStyle.text} hover:shadow`}
    >
      <span className={`h-2 w-2 rounded-full ${phaseStyle.dot}`} aria-hidden />
      <span className="font-mono text-xs">{disjoncteur.id}</span>
      <span className="opacity-90">— {disjoncteur.etiquette}</span>
      {isBornier && (
        <span className="text-[9px] uppercase rounded bg-slate-200 dark:bg-slate-700 px-1 py-0.5">
          Bornier
        </span>
      )}
      {isDiff && (
        <span className="text-[9px] uppercase rounded bg-white/70 dark:bg-slate-950/40 px-1 py-0.5">
          Diff
        </span>
      )}
      {childTableau && (
        <span className="text-[10px] uppercase rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 px-1.5 py-0.5">
          → {childTableau.nom}
        </span>
      )}
      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 ml-auto">
        {disjoncteur.calibre}
      </span>
    </button>
  )
}

function LeavesGroup({
  leaves,
  onOpen,
}: {
  leaves: Disjoncteur[]
  onOpen: (disjoncteurId: string) => void
}) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 p-2">
      <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
        {leaves.length} départ{leaves.length > 1 ? 's' : ''} feuille
        {leaves.length > 1 ? 's' : ''}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {leaves.map((d) => (
          <button
            key={d.id}
            onClick={() => onOpen(d.id)}
            title={`${d.id} — ${d.etiquette}`}
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ring-1 ring-inset ${
              PHASE_STYLES[d.phase_affectation].ring
            } ${PHASE_STYLES[d.phase_affectation].bg} ${
              PHASE_STYLES[d.phase_affectation].text
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                PHASE_STYLES[d.phase_affectation].dot
              }`}
            />
            {d.etiquette || d.id}
          </button>
        ))}
      </div>
    </div>
  )
}

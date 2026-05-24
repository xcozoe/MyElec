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
 * Schéma haut niveau de l'installation : Linky → Itron → tableaux en cascade.
 * À l'intérieur de chaque tableau, on déplie l'arborescence des disjoncteurs
 * en suivant `differentiel_parent_id` (top-level = ceux sans parent dans
 * cette rangée). Les sous-tableaux sont attachés à leur disjoncteur source
 * via `parent_disjoncteur_id`.
 */
export function CheminementView({ store, onOpenTableau }: Props) {
  const rootTableau = useMemo(
    () => store.tableaux.find((t) => !t.parent_tableau_id),
    [store.tableaux],
  )

  if (!rootTableau) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Aucun tableau racine trouvé. Vérifie que l'un des tableaux n'a pas de
        parent_tableau_id.
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
        <TableauNode
          tableau={rootTableau}
          store={store}
          onOpenTableau={onOpenTableau}
        />
      </div>

      <div className="mt-8 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-slate-300 dark:bg-slate-600" />
          Bornier (passif)
        </span>
        <span className="mx-3">·</span>
        <span>
          La cascade électrique est déduite des champs{' '}
          <code>differentiel_parent_id</code>,{' '}
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

function TableauNode({
  tableau,
  store,
  onOpenTableau,
}: {
  tableau: Tableau
  store: Store
  onOpenTableau: (tableauId: string, focusDisjoncteurId?: string) => void
}) {
  const phaseStyle = PHASE_STYLES[tableau.arrivee_phases ?? 'inconnue']
  // Roots = disjoncteurs sans differentiel_parent_id ou dont le parent
  // est hors de ce tableau.
  const allInTableau = new Set<string>()
  for (const r of tableau.rangees)
    for (const d of r.disjoncteurs) allInTableau.add(d.id)

  const roots: { rangee: Rangee; disjoncteur: Disjoncteur }[] = []
  for (const r of tableau.rangees) {
    for (const d of r.disjoncteurs) {
      const parent = d.differentiel_parent_id
      if (!parent || !allInTableau.has(parent)) {
        roots.push({ rangee: r, disjoncteur: d })
      }
    }
  }
  // Tri pour stabilité : par rangée puis par position
  roots.sort((a, b) =>
    a.rangee.numero !== b.rangee.numero
      ? a.rangee.numero - b.rangee.numero
      : a.disjoncteur.position - b.disjoncteur.position,
  )

  return (
    <div
      className={`rounded-lg ring-2 ring-inset ${phaseStyle.ring} ${phaseStyle.bg} px-4 py-3 w-full max-w-3xl`}
    >
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
              onOpenTableau={onOpenTableau}
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
  onOpenTableau,
}: {
  tableau: Tableau
  disjoncteur: Disjoncteur
  store: Store
  onOpenTableau: (tableauId: string, focusDisjoncteurId?: string) => void
}) {
  // Enfants : disjoncteurs du même tableau dont differentiel_parent_id = nous
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

  // Tableaux enfants attachés à ce disjoncteur via parent_disjoncteur_id
  const childTableaux = store.tableaux.filter(
    (t) => t.parent_disjoncteur_id === disjoncteur.id,
  )

  // Groupement compact des feuilles (>3 enfants sans sous-arbre → on les
  // groupe en une seule carte « N départs ») — utile pour les rangées
  // avec beaucoup de petits disjoncteurs.
  const leafChildren = children.filter(
    (c) =>
      !store.tableaux.some(
        (t) => t.parent_disjoncteur_id === c.disjoncteur.id,
      ) &&
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
        onClick={() => onOpenTableau(tableau.id, disjoncteur.id)}
      />

      {(children.length > 0 || childTableaux.length > 0) && (
        <div className="mt-2 ml-4 pl-4 border-l-2 border-slate-300 dark:border-slate-700 space-y-3">
          {nonLeafChildren.map(({ disjoncteur: d }) => (
            <DisjoncteurSubtree
              key={d.id}
              tableau={tableau}
              disjoncteur={d}
              store={store}
              onOpenTableau={onOpenTableau}
            />
          ))}

          {groupLeaves ? (
            <LeavesGroup
              tableau={tableau}
              leaves={leafChildren.map((c) => c.disjoncteur)}
              onOpen={(djId) => onOpenTableau(tableau.id, djId)}
            />
          ) : (
            leafChildren.map(({ disjoncteur: d }) => (
              <DisjoncteurSubtree
                key={d.id}
                tableau={tableau}
                disjoncteur={d}
                store={store}
                onOpenTableau={onOpenTableau}
              />
            ))
          )}

          {childTableaux.map((sub) => (
            <TableauNode
              key={sub.id}
              tableau={sub}
              store={store}
              onOpenTableau={onOpenTableau}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DisjoncteurChip({
  disjoncteur,
  onClick,
}: {
  disjoncteur: Disjoncteur
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
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ring-1 ring-inset ${phaseStyle.ring} ${phaseStyle.bg} ${phaseStyle.text} hover:shadow`}
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
      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 ml-auto">
        {disjoncteur.calibre}
      </span>
    </button>
  )
}

function LeavesGroup({
  tableau,
  leaves,
  onOpen,
}: {
  tableau: Tableau
  leaves: Disjoncteur[]
  onOpen: (disjoncteurId: string) => void
}) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 p-2">
      <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
        {leaves.length} départs en {tableau.nom}
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

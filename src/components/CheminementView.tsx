import { useMemo, useState } from 'react'
import type { Store } from '../hooks/useStore'
import type { Disjoncteur, Tableau } from '../types/electrical'
import { PHASE_STYLES } from '../utils/phaseStyle'
import { Lightbox } from './Lightbox'

interface Props {
  store: Store
  onOpenTableau: (tableauId: string, focusDisjoncteurId?: string) => void
}

/**
 * Schéma haut niveau du cheminement électrique :
 * Linky → Itron → tableau racine, puis pour chaque tableau on affiche À
 * L'INTÉRIEUR de sa boîte les disjoncteurs-clés (différentiel principal +
 * disjoncteurs de jonction qui alimentent un sous-tableau), avec des
 * flèches qui SORTENT du bas du tableau pour rejoindre les sous-tableaux
 * positionnés juste en-dessous, alignés avec leur jonction source.
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
          Vue d'ensemble : à l'intérieur de chaque tableau, les disjoncteurs
          de jonction qui alimentent un sous-tableau apparaissent comme
          modules avec une flèche vers le bas. Tape sur n'importe quel
          élément pour ouvrir le détail.
        </p>
      </div>

      <div className="flex flex-col items-center">
        <SourceNode label="Linky" sub="Compteur Enedis 18 kVA triphasé" />
        <VerticalLink />
        <SourceNode
          label="Itron 30 A / phase"
          sub="Disjoncteur de branchement 4P 500 mA sélectif"
        />
        <VerticalLink />
        <TableauTree
          tableau={root}
          store={store}
          onOpenTableau={onOpenTableau}
        />
      </div>
    </div>
  )
}

// ----- Sources externes -----

function SourceNode({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2 text-center max-w-md">
      <div className="text-sm font-semibold">⚡ {label}</div>
      {sub && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          {sub}
        </div>
      )}
    </div>
  )
}

function VerticalLink({ height = 24 }: { height?: number }) {
  return (
    <div
      className="w-px bg-slate-400 dark:bg-slate-600"
      style={{ height }}
      aria-hidden
    />
  )
}

function Arrow() {
  return (
    <div className="flex flex-col items-center" aria-hidden>
      <div className="h-4 w-px bg-slate-400 dark:bg-slate-600" />
      <div className="text-slate-400 dark:text-slate-600 text-xs leading-none">
        ▼
      </div>
    </div>
  )
}

// ----- Arbre récursif -----

interface Junction {
  sourceDj: Disjoncteur
  child: Tableau
}

function TableauTree({
  tableau,
  store,
  onOpenTableau,
}: {
  tableau: Tableau
  store: Store
  onOpenTableau: (tableauId: string, focusDisjoncteurId?: string) => void
}) {
  // Enfants directs avec leur disjoncteur source
  const junctions: Junction[] = useMemo(() => {
    const out: Junction[] = []
    for (const child of store.tableaux) {
      if (child.parent_tableau_id !== tableau.id) continue
      const sourceDj = findDisjoncteur(tableau, child.parent_disjoncteur_id)
      if (sourceDj) out.push({ sourceDj, child })
    }
    return out
  }, [tableau, store.tableaux])

  return (
    <div className="flex flex-col items-stretch">
      <TableauBox
        tableau={tableau}
        junctions={junctions}
        onOpenTableau={onOpenTableau}
      />

      {junctions.length > 0 && (
        <div className="flex justify-center items-start gap-4 sm:gap-6 mt-0">
          {junctions.map(({ child }) => (
            <div key={child.id} className="flex flex-col items-center min-w-0">
              <Arrow />
              <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                → {child.nom}
              </div>
              <TableauTree
                tableau={child}
                store={store}
                onOpenTableau={onOpenTableau}
              />
            </div>
          ))}
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

// ----- Boîte tableau avec contenu interne -----

function TableauBox({
  tableau,
  junctions,
  onOpenTableau,
}: {
  tableau: Tableau
  junctions: Junction[]
  onOpenTableau: (tableauId: string, focusDisjoncteurId?: string) => void
}) {
  const phaseStyle = PHASE_STYLES[tableau.arrivee_phases ?? 'inconnue']
  const [photoZoom, setPhotoZoom] = useState(false)

  // Différentiel principal du tableau (premier différentiel de tête)
  const mainDiff = useMemo(() => {
    for (const r of tableau.rangees) {
      for (const d of r.disjoncteurs) {
        if (
          d.type_protection === 'differentiel_tete_tableau' ||
          d.type_protection === 'differentiel_tete_rangee'
        ) {
          return d
        }
      }
    }
    return undefined
  }, [tableau])

  const nbDj = tableau.rangees.reduce(
    (acc, r) => acc + r.disjoncteurs.length,
    0,
  )

  // Modules-clés à afficher dans la boîte : différentiel + jonctions.
  // On évite de répéter si le différentiel se trouve aussi être une jonction.
  const junctionIds = new Set(junctions.map((j) => j.sourceDj.id))

  return (
    <div
      className={`rounded-lg ring-2 ring-inset ${phaseStyle.ring} ${phaseStyle.bg} px-4 py-3 max-w-md`}
    >
      <div className="flex items-start gap-3">
        {tableau.photo_url && (
          <button
            type="button"
            onClick={() => setPhotoZoom(true)}
            className="shrink-0 rounded border border-slate-200 dark:border-slate-700 bg-white p-1 hover:shadow"
            aria-label="Agrandir la photo du coffret"
            title="Agrandir"
          >
            <img
              src={tableau.photo_url}
              alt={`Coffret ${tableau.nom}`}
              className="h-14 w-14 object-contain"
              onError={(e) => {
                ;(e.currentTarget.parentElement as HTMLElement).style.display =
                  'none'
              }}
            />
          </button>
        )}
        <button
          onClick={() => onOpenTableau(tableau.id)}
          className="flex-1 text-left hover:opacity-80 min-w-0"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">📦 {tableau.nom}</h2>
            <span
              className={`text-[10px] uppercase tracking-wider ${phaseStyle.text}`}
            >
              · {tableau.alimentation === 'triphase' ? 'TRI' : tableau.arrivee_phases ?? 'mono'}
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {tableau.emplacement} · {nbDj} disjoncteur{nbDj > 1 ? 's' : ''}
          </div>
        </button>
      </div>

      {/* Diff principal du tableau (s'il existe et n'est pas déjà une jonction) */}
      {mainDiff && !junctionIds.has(mainDiff.id) && (
        <div className="mt-3 flex flex-col items-center gap-1">
          <DisjoncteurChip
            dj={mainDiff}
            onClick={() => onOpenTableau(tableau.id, mainDiff.id)}
          />
          {junctions.length > 0 && (
            <div className="h-3 w-px bg-slate-400 dark:bg-slate-600" />
          )}
        </div>
      )}

      {/* Jonctions à l'intérieur du tableau, alignées horizontalement */}
      {junctions.length > 0 && (
        <div className="mt-2 flex justify-around gap-3 sm:gap-4">
          {junctions.map(({ sourceDj, child }) => (
            <div
              key={sourceDj.id}
              className="flex flex-col items-center min-w-0 flex-1"
            >
              <DisjoncteurChip
                dj={sourceDj}
                target={child.nom}
                onClick={() => onOpenTableau(tableau.id, sourceDj.id)}
              />
            </div>
          ))}
        </div>
      )}

      {photoZoom && tableau.photo_url && (
        <Lightbox
          src={tableau.photo_url}
          alt={`Coffret ${tableau.nom}`}
          caption={`${tableau.nom} — ${tableau.emplacement}`}
          onClose={() => setPhotoZoom(false)}
        />
      )}
    </div>
  )
}

// ----- Chip disjoncteur dans la boîte -----

function DisjoncteurChip({
  dj,
  target,
  onClick,
}: {
  dj: Disjoncteur
  target?: string
  onClick: () => void
}) {
  const style = PHASE_STYLES[dj.phase_affectation]
  const isBornier = dj.type_protection === 'bornier_repartition'
  const isDiff =
    dj.type_protection === 'differentiel_tete_tableau' ||
    dj.type_protection === 'differentiel_tete_rangee' ||
    dj.type_protection === 'differentiel_dedie' ||
    dj.type_protection === 'disjoncteur_diff_dedie'

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-md ring-1 ring-inset ${style.ring} ${style.bg} ${style.text} px-2 py-1.5 text-left hover:shadow text-[11px]`}
      title={`${dj.id} — ${dj.etiquette}`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
        <span className="font-mono text-[10px] truncate">{dj.id}</span>
        {isBornier && (
          <span className="text-[8px] uppercase rounded bg-slate-200 dark:bg-slate-700 px-1 py-0.5">
            Bornier
          </span>
        )}
        {isDiff && (
          <span className="text-[8px] uppercase rounded bg-white/70 dark:bg-slate-950/40 px-1 py-0.5">
            Diff
          </span>
        )}
        <span className="text-[9px] font-mono opacity-60 ml-auto shrink-0">
          {dj.calibre}
        </span>
      </div>
      <div className="mt-0.5 font-medium leading-tight line-clamp-1">
        {dj.etiquette}
      </div>
      {target && (
        <div className="text-[9px] uppercase tracking-wide opacity-70 mt-0.5">
          → {target}
        </div>
      )}
    </button>
  )
}

import { Fragment, useMemo, useState } from 'react'
import type { Store } from '../hooks/useStore'
import type { Disjoncteur, Tableau } from '../types/electrical'
import { PHASE_STYLES } from '../utils/phaseStyle'
import { Lightbox } from './Lightbox'

interface Props {
  store: Store
  onOpenTableau: (tableauId: string, focusDisjoncteurId?: string) => void
}

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
          Vue d'ensemble : dans chaque tableau, la cascade des modules clés
          (différentiel → bornier → disjoncteurs) est représentée
          horizontalement avec des flèches entre. Sous chaque module qui
          alimente un sous-tableau, une flèche verticale descend vers ce
          sous-tableau. Tape un élément pour ouvrir son détail.
        </p>
      </div>

      <div className="max-w-5xl mx-auto flex flex-col items-center gap-0">
        <SourceNode
          label="Linky"
          sub="Compteur communicant Enedis triphasé"
          image="/sources/linky.png"
          specs={[
            ['Marque', 'Sagemcom'],
            ['Modèle', 'S34C5 (triphasé)'],
            ['Référence', 'LNE-29125'],
            ['Tension nominale', '3 × 230 / 400 V ~'],
            ['Courant nominal (In)', '10 (60) A par phase'],
            ['Courant maximal (Imax)', '60 A'],
            ['Fréquence', '50 Hz'],
            ['Classe de précision', 'B'],
            ['Normes', 'EN 50470-1 / EN 50470-3'],
            ['Indice de protection', 'IP 51'],
            ['Communication', 'CPL (Courant Porteur en Ligne)'],
            ['Abonnement', '18 kVA triphasé (Total Énergies)'],
            ['Emplacement', 'Coffret extérieur Enedis, ~150 m du tableau principal'],
          ]}
        />
        <VerticalLink />
        <SourceNode
          label="Itron 30 A / phase"
          sub="Disjoncteur de branchement 4P 500 mA sélectif"
          image="/sources/itron.png"
          specs={[
            ['Marque', 'Itron'],
            ['Type', 'Disjoncteur différentiel 4 pôles'],
            ['Référence', 'IID 4-63 II'],
            ['IΔn (sensibilité)', '500 mA — sélectif'],
            ['Ir (courant réglable)', '10 à 30 A (réglé à 30 A par Enedis)'],
            ['Tension nominale', '440 V ~ 50 Hz'],
            ['Nombre de pôles', '4 (3 phases + neutre)'],
            ['Pouvoir de coupure', 'SDB II'],
            ['Norme', 'EN 60947-1'],
            ['Indice de protection', 'IP 20 (façade)'],
            ['Emplacement', 'Coffret extérieur Enedis, ~150 m du tableau principal'],
          ]}
        />
        <VerticalLink />
        <div className="w-full">
          <TableauTree
            tableau={root}
            store={store}
            onOpenTableau={onOpenTableau}
          />
        </div>
      </div>
    </div>
  )
}

// ----- Sources externes -----

function SourceNode({
  label,
  sub,
  image,
  specs,
}: {
  label: string
  sub?: string
  image?: string
  specs?: [string, string][]
}) {
  const [zoom, setZoom] = useState(false)
  const [showSpecs, setShowSpecs] = useState(false)
  const hasSpecs = specs && specs.length > 0

  return (
    <div className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2 w-full max-w-2xl">
      <div className="flex items-center gap-3">
        {image && (
          <button
            onClick={() => setZoom(true)}
            className="shrink-0 rounded border border-slate-200 dark:border-slate-700 bg-white p-1 hover:shadow"
            aria-label={`Agrandir l'image de ${label}`}
            title={`Agrandir : ${label}`}
          >
            <img
              src={image}
              alt={label}
              className="h-14 w-14 object-contain"
              onError={(e) => {
                ;(e.currentTarget.parentElement as HTMLElement).style.display =
                  'none'
              }}
            />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">⚡ {label}</div>
          {sub && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {sub}
            </div>
          )}
          {hasSpecs && (
            <button
              onClick={() => setShowSpecs((s) => !s)}
              className="mt-1 text-[11px] underline decoration-dotted text-slate-600 dark:text-slate-300 hover:opacity-80"
            >
              {showSpecs ? 'Masquer les caractéristiques' : 'Voir les caractéristiques'}
            </button>
          )}
        </div>
      </div>

      {showSpecs && hasSpecs && (
        <dl className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          {specs!.map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="text-slate-500 dark:text-slate-400 shrink-0">
                {k} :
              </dt>
              <dd className="text-slate-700 dark:text-slate-200 break-words">
                {v}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {zoom && image && (
        <Lightbox
          src={image}
          alt={label}
          caption={`${label}${sub ? ' — ' + sub : ''}`}
          onClose={() => setZoom(false)}
        />
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

// ----- Arbre récursif -----

interface ChipNode {
  dj: Disjoncteur
  childTableau?: Tableau
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
  // Construit la liste des chips clés (cascade) avec leur éventuel
  // sous-tableau attaché.
  const { chipNodes, layout } = useMemo(() => {
    const childByDjId = new Map<string, Tableau>()
    for (const t of store.tableaux) {
      if (t.parent_tableau_id === tableau.id && t.parent_disjoncteur_id) {
        childByDjId.set(t.parent_disjoncteur_id, t)
      }
    }
    const nodes = buildCascade(tableau, childByDjId).map((dj) => ({
      dj,
      childTableau: childByDjId.get(dj.id),
    }))
    // Layout horizontal seulement quand le tableau a 2+ sous-tableaux
    // — sinon la cascade verticale est plus lisible (notamment pour les
    // tableaux qui ont beaucoup de différentiels de rangée empilés).
    const layout: 'horizontal' | 'vertical' =
      childByDjId.size >= 2 ? 'horizontal' : 'vertical'
    return { chipNodes: nodes, layout }
  }, [tableau, store.tableaux])

  const hasAnyChild = chipNodes.some((n) => n.childTableau)

  return (
    <div className="flex flex-col items-stretch">
      <TableauBox
        tableau={tableau}
        chipNodes={chipNodes}
        layout={layout}
        onOpenTableau={onOpenTableau}
      />

      {hasAnyChild && layout === 'horizontal' && (
        // Rangée horizontale des sous-tableaux, alignée colonne pour
        // colonne avec les chips de la cascade ci-dessus.
        <div className="flex items-stretch justify-center gap-2">
          {chipNodes.map((node, i) => (
            <Fragment key={node.dj.id}>
              {i > 0 && <div className="w-6 shrink-0" aria-hidden />}
              <div className="flex-1 min-w-0 flex flex-col items-center">
                {node.childTableau ? (
                  <>
                    <div className="-mt-3 h-6 w-0.5 bg-slate-500 dark:bg-slate-400 relative z-10" />
                    <div className="text-slate-500 dark:text-slate-400 text-xs leading-none -mt-1">
                      ▼
                    </div>
                    <div className="text-[9px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1 text-center">
                      → {node.childTableau.nom}
                    </div>
                    <div className="w-full">
                      <TableauTree
                        tableau={node.childTableau}
                        store={store}
                        onOpenTableau={onOpenTableau}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </Fragment>
          ))}
        </div>
      )}

      {hasAnyChild && layout === 'vertical' && (
        // Sous-tableaux empilés verticalement (layout simple).
        <div className="flex flex-col items-stretch gap-0">
          {chipNodes
            .filter((n) => n.childTableau)
            .map((node) => (
              <div key={node.dj.id} className="flex flex-col items-center">
                <div className="-mt-3 h-6 w-0.5 bg-slate-500 dark:bg-slate-400 relative z-10" />
                <div className="text-slate-500 dark:text-slate-400 text-xs leading-none -mt-1">
                  ▼
                </div>
                <div className="text-[9px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1 text-center">
                  → {node.childTableau!.nom}
                </div>
                <div className="w-full">
                  <TableauTree
                    tableau={node.childTableau!}
                    store={store}
                    onOpenTableau={onOpenTableau}
                  />
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

/**
 * Construit la liste linéaire des chips clés d'un tableau dans l'ordre
 * du cheminement électrique (BFS depuis les roots, en suivant
 * differentiel_parent_id). On garde les différentiels, borniers et
 * disjoncteurs alimentant un sous-tableau ; on exclut les feuilles
 * (départs locaux).
 */
function buildCascade(
  tableau: Tableau,
  childByDjId: Map<string, Tableau>,
): Disjoncteur[] {
  const allDjs = tableau.rangees.flatMap((r) => r.disjoncteurs)
  const allIds = new Set(allDjs.map((d) => d.id))

  const isKey = (d: Disjoncteur) =>
    d.type_protection === 'differentiel_tete_tableau' ||
    d.type_protection === 'differentiel_tete_rangee' ||
    d.type_protection === 'differentiel_dedie' ||
    d.type_protection === 'disjoncteur_diff_dedie' ||
    d.type_protection === 'bornier_repartition' ||
    childByDjId.has(d.id)

  const result: Disjoncteur[] = []
  const visited = new Set<string>()
  const queue: Disjoncteur[] = allDjs.filter(
    (d) => !d.differentiel_parent_id || !allIds.has(d.differentiel_parent_id),
  )
  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current.id)) continue
    visited.add(current.id)
    if (isKey(current)) result.push(current)
    for (const d of allDjs) {
      if (d.differentiel_parent_id === current.id && !visited.has(d.id)) {
        queue.push(d)
      }
    }
  }
  return result
}

// ----- Boîte tableau avec cascade horizontale -----

function TableauBox({
  tableau,
  chipNodes,
  layout,
  onOpenTableau,
}: {
  tableau: Tableau
  chipNodes: ChipNode[]
  layout: 'horizontal' | 'vertical'
  onOpenTableau: (tableauId: string, focusDisjoncteurId?: string) => void
}) {
  const phaseStyle = PHASE_STYLES[tableau.arrivee_phases ?? 'inconnue']
  const [photoZoom, setPhotoZoom] = useState(false)
  const nbDj = tableau.rangees.reduce(
    (acc, r) => acc + r.disjoncteurs.length,
    0,
  )

  // Cascade horizontale : on ajoute un disjoncteur qui ne va PAS vers un
  // sous-tableau au début (différentiel) et chaîne ensuite ceux qui ont
  // un enfant. Si un même tableau a plusieurs chemins, ils restent dans
  // l'ordre du BFS.

  return (
    <div
      className={`rounded-lg ring-2 ring-inset ${phaseStyle.ring} ${phaseStyle.bg} px-4 pt-3 pb-6 w-full`}
    >
      <div className="flex items-start gap-3 pb-3">
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

      {/* Cascade : horizontale quand le tableau a 2+ sous-tableaux
          (parallélisme visible), verticale sinon (compact + lisible). */}
      {chipNodes.length > 0 && layout === 'horizontal' && (
        <div className="flex items-stretch justify-center gap-2">
          {chipNodes.map((node, i) => (
            <Fragment key={node.dj.id}>
              {i > 0 && (
                <div
                  className="self-center text-slate-500 dark:text-slate-400 text-sm shrink-0 w-6 text-center"
                  aria-hidden
                >
                  →
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col items-stretch">
                <DisjoncteurChip
                  dj={node.dj}
                  target={node.childTableau?.nom}
                  onClick={() => onOpenTableau(tableau.id, node.dj.id)}
                />
                {node.childTableau && (
                  <div className="flex justify-center mt-2 -mb-6">
                    <div className="h-9 w-0.5 bg-slate-500 dark:bg-slate-400 relative z-10" />
                  </div>
                )}
              </div>
            </Fragment>
          ))}
        </div>
      )}

      {chipNodes.length > 0 && layout === 'vertical' && (
        <div className="flex flex-col items-stretch gap-0">
          {chipNodes.map((node, i) => {
            const isLast = i === chipNodes.length - 1
            return (
              <Fragment key={node.dj.id}>
                <DisjoncteurChip
                  dj={node.dj}
                  target={node.childTableau?.nom}
                  onClick={() => onOpenTableau(tableau.id, node.dj.id)}
                />
                {!isLast && (
                  <div className="flex flex-col items-center py-1">
                    <div className="h-3 w-0.5 bg-slate-500 dark:bg-slate-400" />
                    <div className="text-slate-500 dark:text-slate-400 text-xs leading-none -mt-1">
                      ▼
                    </div>
                  </div>
                )}
                {isLast && node.childTableau && (
                  <div className="flex justify-center mt-2 -mb-6">
                    <div className="h-9 w-0.5 bg-slate-500 dark:bg-slate-400 relative z-10" />
                  </div>
                )}
              </Fragment>
            )
          })}
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

// ----- Chip disjoncteur -----

function DisjoncteurChip({
  dj,
  target,
  onClick,
}: {
  dj: Disjoncteur
  target?: string
  onClick: () => void
}) {
  const [zoom, setZoom] = useState(false)
  const style = PHASE_STYLES[dj.phase_affectation]
  const isBornier = dj.type_protection === 'bornier_repartition'
  const isDiff =
    dj.type_protection === 'differentiel_tete_tableau' ||
    dj.type_protection === 'differentiel_tete_rangee' ||
    dj.type_protection === 'differentiel_dedie' ||
    dj.type_protection === 'disjoncteur_diff_dedie'

  return (
    <>
      <div
        className={`w-full h-full rounded-md ring-1 ring-inset ${style.ring} ${style.bg} ${style.text} px-2 py-1.5 text-left text-[11px] flex flex-col gap-1`}
        title={`${dj.id} — ${dj.etiquette}`}
      >
        <div className="flex items-start gap-2">
          {dj.photo_url && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setZoom(true)
              }}
              className="shrink-0 rounded border border-slate-200 dark:border-slate-700 bg-white p-0.5 hover:shadow"
              aria-label="Agrandir la photo"
              title="Agrandir"
            >
              <img
                src={dj.photo_url}
                alt={dj.id}
                className="h-9 w-9 object-contain"
                onError={(e) => {
                  ;(e.currentTarget.parentElement as HTMLElement).style.display =
                    'none'
                }}
              />
            </button>
          )}
          <button
            onClick={onClick}
            className="flex-1 text-left hover:opacity-80 min-w-0"
          >
            <div className="flex items-center flex-wrap gap-1">
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
            </div>
            <div className="mt-0.5 font-medium leading-tight line-clamp-2">
              {dj.etiquette}
            </div>
            <div className="text-[9px] font-mono opacity-60 mt-0.5">
              {dj.calibre}
            </div>
            {target && (
              <div className="text-[9px] uppercase tracking-wide opacity-70 mt-0.5">
                → {target}
              </div>
            )}
          </button>
        </div>
      </div>
      {zoom && dj.photo_url && (
        <Lightbox
          src={dj.photo_url}
          alt={`${dj.id} — ${dj.etiquette}`}
          caption={`${dj.id} — ${dj.etiquette}`}
          onClose={() => setZoom(false)}
        />
      )}
    </>
  )
}

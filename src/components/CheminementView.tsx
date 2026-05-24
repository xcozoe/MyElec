import { useMemo, useState } from 'react'
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
          Vue d'ensemble : à l'intérieur de chaque tableau, les disjoncteurs
          de jonction qui alimentent un sous-tableau apparaissent comme
          modules. Une flèche descend de chaque jonction vers le sous-tableau
          en-dessous. Tape sur n'importe quel élément pour ouvrir le détail.
        </p>
      </div>

      <div className="max-w-4xl mx-auto flex flex-col items-center gap-0">
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

// ----- Sources externes (avec photo + specs dépliables) -----

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
    <div className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2 max-w-2xl">
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

      {/* Rangée enfants : alignée avec les jonctions ci-dessus.
          Chaque colonne commence par une ligne verticale qui démarre
          NÉGATIVEMENT (margin-top négative) pour s'enfoncer dans la
          padding-bottom du tableau au-dessus, créant la continuité
          visuelle qui « traverse » le bord du tableau. */}
      {junctions.length > 0 && (
        <div className="flex justify-around items-start gap-3 sm:gap-4">
          {junctions.map(({ child }) => (
            <div
              key={child.id}
              className="flex flex-col items-center min-w-0 flex-1"
            >
              {/* Ligne qui pénètre dans le tableau parent : -mt-4
                  recule de 16 px dans la zone du chip, et la couleur
                  identique à la ligne intérieure rend l'ensemble
                  visuellement continu. */}
              <div className="-mt-4 h-8 w-0.5 bg-slate-500 dark:bg-slate-400 relative z-10" />
              <div className="text-slate-500 dark:text-slate-400 text-xs leading-none -mt-1">
                ▼
              </div>
              <div className="text-[9px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1 text-center">
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
  const junctionIds = new Set(junctions.map((j) => j.sourceDj.id))

  return (
    <div
      className={`rounded-lg ring-2 ring-inset ${phaseStyle.ring} ${phaseStyle.bg} px-4 pt-3 pb-0 w-full`}
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

      {/* Différentiel principal */}
      {mainDiff && !junctionIds.has(mainDiff.id) && (
        <div className="flex flex-col items-center gap-1 pb-2">
          <div className="w-full max-w-xs">
            <DisjoncteurChip
              dj={mainDiff}
              onClick={() => onOpenTableau(tableau.id, mainDiff.id)}
            />
          </div>
          {junctions.length > 0 && (
            <div className="h-3 w-px bg-slate-400 dark:bg-slate-600" />
          )}
        </div>
      )}

      {/* Jonctions à l'intérieur du tableau. La continuité visuelle
          jusqu'au sous-tableau est assurée par la ligne extérieure
          qui remonte (margin-top négatif) — voir TableauTree. */}
      {junctions.length > 0 && (
        <div className="flex justify-around items-stretch gap-3 sm:gap-4 pb-6">
          {junctions.map(({ sourceDj, child }) => (
            <div
              key={sourceDj.id}
              className="flex flex-col items-center min-w-0 flex-1"
            >
              <div className="w-full">
                <DisjoncteurChip
                  dj={sourceDj}
                  target={child.nom}
                  onClick={() => onOpenTableau(tableau.id, sourceDj.id)}
                />
              </div>
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

// ----- Chip disjoncteur (avec photo si présente) -----

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
        className={`w-full rounded-md ring-1 ring-inset ${style.ring} ${style.bg} ${style.text} px-2 py-1.5 text-left text-[11px] flex items-start gap-2`}
        title={`${dj.id} — ${dj.etiquette}`}
      >
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

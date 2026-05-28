import { useMemo } from 'react'
import type { Store } from '../hooks/useStore'
import { endpointTypeLabel, murLabel } from '../types/electrical'
import { PHASE_STYLES } from '../utils/phaseStyle'
import { clickableRowProps } from '../utils/form'

interface Props {
  ligneId: string
  store: Store
  onBack: () => void
  onEditLigne: () => void
  onOpenDisjoncteur?: (tableauId: string, disjoncteurId: string) => void
  onOpenEndpoint?: (endpointId: string) => void
  onOpenAppareil?: (appareilId: string) => void
  onOpenPiece?: (pieceId: string) => void
}

export function LigneDetail({
  ligneId,
  store,
  onBack,
  onEditLigne,
  onOpenDisjoncteur,
  onOpenEndpoint,
  onOpenAppareil,
  onOpenPiece,
}: Props) {
  const ligne = store.lignes.find((l) => l.id === ligneId)
  const disjoncteurInfo = useMemo(() => {
    if (!ligne) return undefined
    for (const t of store.tableaux) {
      for (const r of t.rangees) {
        const d = r.disjoncteurs.find((x) => x.id === ligne.disjoncteur_id)
        if (d) return { tableau: t, rangee: r, disjoncteur: d }
      }
    }
    return undefined
  }, [ligne, store.tableaux])

  const ligneEndpoints = useMemo(
    () => store.endpoints.filter((e) => e.ligne_id === ligneId),
    [store.endpoints, ligneId],
  )
  const ligneAppareils = useMemo(
    () => store.appareils.filter((a) => a.ligne_id === ligneId),
    [store.appareils, ligneId],
  )
  const ligneVolets = useMemo(
    () => store.volets.filter((v) => v.ligne_id === ligneId),
    [store.volets, ligneId],
  )

  if (!ligne) {
    return (
      <div>
        <button
          onClick={onBack}
          className="text-sm text-slate-500 dark:text-slate-400 hover:underline"
        >
          ← Retour
        </button>
        <div className="mt-4">Ligne introuvable.</div>
      </div>
    )
  }

  const phaseStyle =
    PHASE_STYLES[disjoncteurInfo?.disjoncteur.phase_affectation ?? 'inconnue']

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <button
          onClick={onBack}
          className="text-sm text-slate-500 dark:text-slate-400 hover:underline"
        >
          ← Lignes
        </button>
        <button
          onClick={onEditLigne}
          className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5"
        >
          Éditer la ligne
        </button>
      </div>

      <header className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">
              <span className="font-mono">{ligne.id}</span>
              <span className="ml-2 font-normal text-slate-600 dark:text-slate-400">
                — {ligne.libelle}
              </span>
            </h1>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {disjoncteurInfo ? (
                <>
                  Source :{' '}
                  <button
                    onClick={() =>
                      onOpenDisjoncteur?.(
                        disjoncteurInfo.tableau.id,
                        disjoncteurInfo.disjoncteur.id,
                      )
                    }
                    className="underline decoration-dotted hover:opacity-80"
                  >
                    <code className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">
                      {disjoncteurInfo.disjoncteur.id}
                    </code>{' '}
                    ({disjoncteurInfo.disjoncteur.etiquette})
                  </button>
                  {' · '}
                  {disjoncteurInfo.tableau.nom} ·{' '}
                  {disjoncteurInfo.rangee.libelle} ·{' '}
                  {disjoncteurInfo.disjoncteur.calibre}
                </>
              ) : (
                <span className="text-red-700 dark:text-red-300">
                  Disjoncteur source {ligne.disjoncteur_id} introuvable.
                </span>
              )}
            </div>
          </div>
          <span
            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 ring-inset ${phaseStyle.ring} ${phaseStyle.bg} ${phaseStyle.text}`}
          >
            <span className={`h-2 w-2 rounded-full ${phaseStyle.dot}`} />
            {phaseStyle.label}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
          {ligne.section_mm2 !== undefined && (
            <Stat label="Section">{ligne.section_mm2} mm²</Stat>
          )}
          {ligne.longueur_estimee_m !== undefined && (
            <Stat label="Longueur estimée">{ligne.longueur_estimee_m} m</Stat>
          )}
          <Stat label="End-points">{ligneEndpoints.length}</Stat>
          <Stat label="Appareils">{ligneAppareils.length}</Stat>
          <Stat label="Volets">{ligneVolets.length}</Stat>
        </div>
        {ligne.parcours && (
          <div className="mt-3 text-sm text-slate-700 dark:text-slate-300">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Parcours
            </span>
            <div>{ligne.parcours}</div>
          </div>
        )}
        {ligne.notes && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {ligne.notes}
          </p>
        )}
      </header>

      <Section title="End-points raccordés" count={ligneEndpoints.length}>
        {ligneEndpoints.length === 0 ? (
          <Empty>Aucun end-point ne référence cette ligne.</Empty>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {ligneEndpoints.map((e) => {
              const piece = store.pieces.find((p) => p.id === e.piece_id)
              return (
                <li
                  key={e.id}
                  {...clickableRowProps(() => onOpenEndpoint?.(e.id))}
                  className="px-4 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3"
                >
                  <span className="text-xs font-mono w-40 shrink-0 truncate">
                    {e.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      {endpointTypeLabel(e.type)}
                      {e.usage_principal && (
                        <span className="text-slate-500 dark:text-slate-400">
                          {' '}— {e.usage_principal}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {piece && (
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation()
                            onOpenPiece?.(piece.id)
                          }}
                          className="underline decoration-dotted hover:opacity-80"
                        >
                          {piece.nom}
                        </button>
                      )}{' '}
                      · {murLabel(e.mur)} n°{e.numero}
                      {e.position_detail && <> · {e.position_detail}</>}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Section title="Appareils alimentés directement" count={ligneAppareils.length}>
          {ligneAppareils.length === 0 ? (
            <Empty>Aucun appareil rattaché directement.</Empty>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {ligneAppareils.map((a) => (
                <li
                  key={a.id}
                  {...clickableRowProps(() => onOpenAppareil?.(a.id))}
                  className="px-4 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="text-sm font-medium">{a.nom}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {a.id} · {a.categorie} · {a.profil_usage}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Volets motorisés sur cette ligne" count={ligneVolets.length}>
          {ligneVolets.length === 0 ? (
            <Empty>Aucun volet motorisé rattaché.</Empty>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {ligneVolets.map((v) => (
                <li key={v.id} className="px-4 py-2">
                  <div className="text-sm font-mono">{v.id}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {v.type.replace('_', ' ')} · {v.motorisation.replace('_', ' ')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  )
}

function Stat({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <span>
      <span className="text-[10px] uppercase tracking-wide block">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
        {children}
      </span>
    </span>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <header className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-semibold">
          {title}
          {count > 0 && (
            <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
              {count}
            </span>
          )}
        </h3>
      </header>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 italic">
      {children}
    </div>
  )
}

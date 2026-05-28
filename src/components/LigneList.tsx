import { useMemo, useState } from 'react'
import type {
  AppareilFixe,
  Disjoncteur,
  EndPoint,
  Ligne,
  Phase,
  Piece,
  Tableau,
} from '../types/electrical'
import { PHASES } from '../types/electrical'
import { PHASE_STYLES } from '../utils/phaseStyle'
import { clickableRowProps } from '../utils/form'
import { buildDisjoncteurOptions } from './LigneEditor'

interface Props {
  lignes: Ligne[]
  tableaux: Tableau[]
  endpoints: EndPoint[]
  appareils: AppareilFixe[]
  pieces: Piece[]
  onOpen: (ligneId: string) => void
  onCreate: () => void
}

interface LigneStats {
  nbEp: number
  nbAp: number
  piecesNoms: string[]
}

export function LigneList({
  lignes,
  tableaux,
  endpoints,
  appareils,
  pieces,
  onOpen,
  onCreate,
}: Props) {
  const [filterPhase, setFilterPhase] = useState<'all' | Phase>('all')

  const djById = useMemo(() => {
    const map = new Map<string, { dj: Disjoncteur; tableauNom: string }>()
    for (const t of tableaux) {
      for (const r of t.rangees) {
        for (const d of r.disjoncteurs) {
          map.set(d.id, { dj: d, tableauNom: t.nom })
        }
      }
    }
    return map
  }, [tableaux])

  const filteredLignes = useMemo(() => {
    if (filterPhase === 'all') return lignes
    return lignes.filter((l) => {
      const dj = djById.get(l.disjoncteur_id)?.dj
      return dj?.phase_affectation === filterPhase
    })
  }, [lignes, djById, filterPhase])

  const byTableau = useMemo(() => {
    const groups = new Map<string, Ligne[]>()
    for (const t of tableaux) groups.set(t.nom, [])
    const unknown: Ligne[] = []
    for (const l of filteredLignes) {
      const info = djById.get(l.disjoncteur_id)
      if (info) {
        const arr = groups.get(info.tableauNom) ?? []
        arr.push(l)
        groups.set(info.tableauNom, arr)
      } else {
        unknown.push(l)
      }
    }
    return { groups, unknown }
  }, [filteredLignes, tableaux, djById])

  const totalDjOptions = useMemo(
    () => buildDisjoncteurOptions(tableaux).length,
    [tableaux],
  )

  // Stats par ligne pré-calculées en un seul passage (au lieu de filtrer
  // tous les end-points/appareils + find pièces pour CHAQUE ligne au rendu).
  const ligneStats = useMemo(() => {
    const pieceNameById = new Map(pieces.map((p) => [p.id, p.nom]))
    const acc = new Map<
      string,
      { nbEp: number; nbAp: number; pieceIds: Set<string> }
    >()
    const slot = (id: string) => {
      let s = acc.get(id)
      if (!s) {
        s = { nbEp: 0, nbAp: 0, pieceIds: new Set() }
        acc.set(id, s)
      }
      return s
    }
    for (const e of endpoints) {
      if (!e.ligne_id) continue
      const s = slot(e.ligne_id)
      s.nbEp++
      s.pieceIds.add(e.piece_id)
    }
    for (const a of appareils) {
      if (!a.ligne_id) continue
      slot(a.ligne_id).nbAp++
    }
    const result = new Map<string, LigneStats>()
    for (const [id, s] of acc) {
      result.set(id, {
        nbEp: s.nbEp,
        nbAp: s.nbAp,
        piecesNoms: [...s.pieceIds]
          .map((pid) => pieceNameById.get(pid) ?? pid)
          .sort((a, b) => a.localeCompare(b, 'fr')),
      })
    }
    return result
  }, [endpoints, appareils, pieces])

  const emptyStats: LigneStats = { nbEp: 0, nbAp: 0, piecesNoms: [] }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Lignes électriques
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {lignes.length} ligne{lignes.length > 1 ? 's' : ''} référencée
            {lignes.length > 1 ? 's' : ''}.{' '}
            {totalDjOptions} disjoncteur{totalDjOptions > 1 ? 's' : ''} actif
            {totalDjOptions > 1 ? 's' : ''} disponible
            {totalDjOptions > 1 ? 's' : ''} comme source.
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <select
            value={filterPhase}
            onChange={(e) => setFilterPhase(e.target.value as 'all' | Phase)}
            className="text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
          >
            <option value="all">Toutes phases</option>
            {PHASES.map((p) => (
              <option key={p} value={p}>
                Phase {p}
              </option>
            ))}
          </select>
          <button
            onClick={onCreate}
            className="text-sm rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-1.5"
          >
            + Nouvelle ligne
          </button>
        </div>
      </div>

      {lignes.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Aucune ligne enregistrée. Cliquez sur « + Nouvelle ligne » pour
          commencer à cartographier les circuits.
        </div>
      ) : (
        <>
          {[...byTableau.groups.entries()].map(([nom, list]) => {
            if (list.length === 0) return null
            return (
              <section key={nom} className="mb-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                  {nom}
                </h2>
                <ul className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                  {list.map((l) => {
                    const info = djById.get(l.disjoncteur_id)
                    const dj = info?.dj
                    const style = PHASE_STYLES[dj?.phase_affectation ?? 'inconnue']
                    const { nbEp, nbAp, piecesNoms } =
                      ligneStats.get(l.id) ?? emptyStats
                    return (
                      <li
                        key={l.id}
                        {...clickableRowProps(() => onOpen(l.id))}
                        className="px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-mono text-sm font-semibold">{l.id}</span>
                          <span className="text-sm">— {l.libelle}</span>
                          <span
                            className={`ml-auto inline-flex items-center gap-1 text-[10px] uppercase rounded-full px-2 py-0.5 ring-1 ring-inset ${style.ring} ${style.bg} ${style.text}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                            {style.label}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {dj ? (
                            <>
                              <code className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">
                                {dj.id}
                              </code>{' '}
                              {dj.etiquette} · {dj.calibre}
                            </>
                          ) : (
                            <span className="text-red-700 dark:text-red-300">
                              disjoncteur source introuvable ({l.disjoncteur_id})
                            </span>
                          )}
                          {l.section_mm2 && <> · section {l.section_mm2} mm²</>}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {nbEp} end-point{nbEp > 1 ? 's' : ''} · {nbAp} appareil
                          {nbAp > 1 ? 's' : ''}
                          {piecesNoms.length > 0 && (
                            <> · pièces traversées : {piecesNoms.join(', ')}</>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
          {byTableau.unknown.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-red-700 dark:text-red-300 mb-2">
                Source introuvable
              </h2>
              <ul className="rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-slate-900 divide-y divide-red-100 dark:divide-red-900">
                {byTableau.unknown.map((l) => (
                  <li
                    key={l.id}
                    {...clickableRowProps(() => onOpen(l.id))}
                    className="px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <span className="font-mono text-sm">{l.id}</span> — {l.libelle}
                    <div className="text-xs text-red-700 dark:text-red-300">
                      référence vers {l.disjoncteur_id} non résolue
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

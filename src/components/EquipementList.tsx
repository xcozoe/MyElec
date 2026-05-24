import { useMemo, useState } from 'react'
import type {
  AppareilFixe,
  CategorieAppareil,
  EndPoint,
  Ligne,
  Piece,
  Volet,
} from '../types/electrical'
import { CATEGORIES_APPAREIL } from '../types/electrical'

type Tab = 'appareils' | 'volets'

interface Props {
  appareils: AppareilFixe[]
  volets: Volet[]
  pieces: Piece[]
  lignes: Ligne[]
  endpoints: EndPoint[]
  onOpenAppareil: (id: string) => void
  onCreateAppareil: () => void
  onOpenVolet: (id: string) => void
  onCreateVolet: () => void
  onOpenLigne?: (id: string) => void
  onOpenPiece?: (id: string) => void
}

export function EquipementList({
  appareils,
  volets,
  pieces,
  lignes,
  endpoints,
  onOpenAppareil,
  onCreateAppareil,
  onOpenVolet,
  onCreateVolet,
  onOpenLigne,
  onOpenPiece,
}: Props) {
  const [tab, setTab] = useState<Tab>('appareils')
  const [filterPieceId, setFilterPieceId] = useState<string>('all')
  const [filterCategorie, setFilterCategorie] = useState<string>('all')

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
        Équipements
      </h1>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="inline-flex rounded-md border border-slate-300 dark:border-slate-700 overflow-hidden text-sm">
          <TabButton active={tab === 'appareils'} onClick={() => setTab('appareils')}>
            Appareils ({appareils.length})
          </TabButton>
          <TabButton active={tab === 'volets'} onClick={() => setTab('volets')}>
            Volets ({volets.length})
          </TabButton>
        </div>

        <select
          value={filterPieceId}
          onChange={(e) => setFilterPieceId(e.target.value)}
          className="text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
        >
          <option value="all">Toutes pièces</option>
          {pieces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}
            </option>
          ))}
        </select>

        {tab === 'appareils' && (
          <select
            value={filterCategorie}
            onChange={(e) => setFilterCategorie(e.target.value)}
            className="text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
          >
            <option value="all">Toutes catégories</option>
            {CATEGORIES_APPAREIL.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={tab === 'appareils' ? onCreateAppareil : onCreateVolet}
          className="ml-auto text-sm rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-1.5"
        >
          + Nouveau {tab === 'appareils' ? 'appareil' : 'volet'}
        </button>
      </div>

      {tab === 'appareils' ? (
        <AppareilsView
          appareils={appareils}
          pieces={pieces}
          lignes={lignes}
          endpoints={endpoints}
          filterPieceId={filterPieceId}
          filterCategorie={filterCategorie}
          onOpen={onOpenAppareil}
          onOpenLigne={onOpenLigne}
          onOpenPiece={onOpenPiece}
        />
      ) : (
        <VoletsView
          volets={volets}
          pieces={pieces}
          lignes={lignes}
          filterPieceId={filterPieceId}
          onOpen={onOpenVolet}
          onOpenLigne={onOpenLigne}
          onOpenPiece={onOpenPiece}
        />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-1.5'
          : 'px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800'
      }
    >
      {children}
    </button>
  )
}

function AppareilsView({
  appareils,
  pieces,
  lignes,
  endpoints,
  filterPieceId,
  filterCategorie,
  onOpen,
  onOpenLigne,
  onOpenPiece,
}: {
  appareils: AppareilFixe[]
  pieces: Piece[]
  lignes: Ligne[]
  endpoints: EndPoint[]
  filterPieceId: string
  filterCategorie: string
  onOpen: (id: string) => void
  onOpenLigne?: (id: string) => void
  onOpenPiece?: (id: string) => void
}) {
  const filtered = useMemo(() => {
    return appareils.filter(
      (a) =>
        (filterPieceId === 'all' || a.piece_id === filterPieceId) &&
        (filterCategorie === 'all' || a.categorie === filterCategorie),
    )
  }, [appareils, filterPieceId, filterCategorie])

  const byCategorie = useMemo(() => {
    const groups = new Map<CategorieAppareil, AppareilFixe[]>()
    for (const c of CATEGORIES_APPAREIL) groups.set(c.value, [])
    for (const a of filtered) {
      const arr = groups.get(a.categorie) ?? []
      arr.push(a)
      groups.set(a.categorie, arr)
    }
    return [...groups.entries()].filter(([, list]) => list.length > 0)
  }, [filtered])

  if (filtered.length === 0) {
    return (
      <Empty>Aucun appareil ne correspond aux filtres.</Empty>
    )
  }

  return (
    <div className="space-y-4">
      {byCategorie.map(([cat, list]) => {
        const label = CATEGORIES_APPAREIL.find((c) => c.value === cat)?.label ?? cat
        return (
          <section
            key={cat}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            <header className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold">
                {label}{' '}
                <span className="font-normal text-slate-500 dark:text-slate-400">
                  ({list.length})
                </span>
              </h3>
            </header>
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {list.map((a) => {
                const piece = pieces.find((p) => p.id === a.piece_id)
                const branchePrise = a.branche_sur
                  ? endpoints.find((e) => e.id === a.branche_sur)
                  : undefined
                const ligne = a.ligne_id
                  ? lignes.find((l) => l.id === a.ligne_id)
                  : undefined
                return (
                  <li
                    key={a.id}
                    onClick={() => onOpen(a.id)}
                    className="px-4 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3"
                  >
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 w-28 shrink-0 truncate">
                      {a.id}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{a.nom}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {piece && (
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation()
                              onOpenPiece?.(piece.id)
                            }}
                            className="underline decoration-dotted"
                          >
                            {piece.nom}
                          </button>
                        )}
                        {' '}· {a.profil_usage}
                        {a.puissance_nominale_w && <> · {a.puissance_nominale_w} W</>}
                        {a.marque && <> · {a.marque} {a.modele ?? ''}</>}
                      </div>
                    </div>
                    {ligne && onOpenLigne && (
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation()
                          onOpenLigne(ligne.id)
                        }}
                        className="text-[10px] uppercase rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5"
                        title={`Ligne ${ligne.id} — ${ligne.libelle}`}
                      >
                        ligne {ligne.id}
                      </button>
                    )}
                    {branchePrise && (
                      <span
                        className="text-[10px] uppercase rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5"
                        title={`Branché sur ${branchePrise.id}`}
                      >
                        prise {branchePrise.id}
                      </span>
                    )}
                    {!ligne && !branchePrise && (
                      <span className="text-[10px] uppercase rounded bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 px-2 py-0.5">
                        à raccorder
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function VoletsView({
  volets,
  pieces,
  lignes,
  filterPieceId,
  onOpen,
  onOpenLigne,
  onOpenPiece,
}: {
  volets: Volet[]
  pieces: Piece[]
  lignes: Ligne[]
  filterPieceId: string
  onOpen: (id: string) => void
  onOpenLigne?: (id: string) => void
  onOpenPiece?: (id: string) => void
}) {
  const filtered = useMemo(
    () =>
      volets.filter(
        (v) => filterPieceId === 'all' || v.piece_id === filterPieceId,
      ),
    [volets, filterPieceId],
  )

  const byPiece = useMemo(() => {
    const groups = new Map<string, Volet[]>()
    for (const v of filtered) {
      const arr = groups.get(v.piece_id) ?? []
      arr.push(v)
      groups.set(v.piece_id, arr)
    }
    return [...groups.entries()]
  }, [filtered])

  if (filtered.length === 0) return <Empty>Aucun volet enregistré.</Empty>

  return (
    <div className="space-y-4">
      {byPiece.map(([pid, list]) => {
        const piece = pieces.find((p) => p.id === pid)
        return (
          <section
            key={pid}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            <header className="px-4 py-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold">
                <button
                  onClick={() => onOpenPiece?.(pid)}
                  className="underline decoration-dotted"
                >
                  {piece?.nom ?? pid}
                </button>{' '}
                <span className="font-normal text-slate-500 dark:text-slate-400">
                  ({list.length})
                </span>
              </h3>
            </header>
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {list.map((v) => {
                const ligne = v.ligne_id ? lignes.find((l) => l.id === v.ligne_id) : undefined
                return (
                  <li
                    key={v.id}
                    onClick={() => onOpen(v.id)}
                    className="px-4 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3"
                  >
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 w-24 shrink-0">
                      {v.id}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        {v.type.replace('_', ' ')}
                        {v.largeur_cm && (
                          <span className="text-slate-500 dark:text-slate-400">
                            {' '}· {v.largeur_cm} cm
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {v.motorisation.replace('_', ' ')}
                        {v.commande_centralisee === 'oui' && ' · centralisé'}
                      </div>
                    </div>
                    {ligne && onOpenLigne && (
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation()
                          onOpenLigne(ligne.id)
                        }}
                        className="text-[10px] uppercase rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-0.5"
                      >
                        ligne {ligne.id}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
      {children}
    </div>
  )
}

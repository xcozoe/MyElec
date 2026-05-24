import { useMemo } from 'react'
import type {
  AppareilFixe,
  EndPoint,
  Niveau,
  Piece,
  Volet,
} from '../types/electrical'
import { NIVEAUX } from '../types/electrical'

interface CountByType {
  PC: number
  PD: number
  PL: number
  IN: number
  BT: number
  RJ45: number
  TV: number
  AUTRE: number
}

function countEndpoints(pieceId: string, endpoints: EndPoint[]): CountByType {
  const c: CountByType = {
    PC: 0,
    PD: 0,
    PL: 0,
    IN: 0,
    BT: 0,
    RJ45: 0,
    TV: 0,
    AUTRE: 0,
  }
  for (const e of endpoints) {
    if (e.piece_id === pieceId) c[e.type] += 1
  }
  return c
}

function countVolets(pieceId: string, volets: Volet[]): number {
  return volets.filter((v) => v.piece_id === pieceId).length
}

function countAppareils(pieceId: string, appareils: AppareilFixe[]): number {
  return appareils.filter((a) => a.piece_id === pieceId).length
}

function categorieLabel(c: Piece['categorie']): string {
  switch (c) {
    case 'interieur':
      return 'Intérieur'
    case 'exterieur':
      return 'Extérieur'
    case 'technique':
      return 'Technique'
    case 'virtuelle':
      return 'Virtuelle'
  }
}

function categorieStyle(c: Piece['categorie']): string {
  switch (c) {
    case 'interieur':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
    case 'exterieur':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
    case 'technique':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
    case 'virtuelle':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
  }
}

export function PieceList({
  pieces,
  endpoints,
  volets,
  appareils,
  onOpen,
  onCreate,
}: {
  pieces: Piece[]
  endpoints: EndPoint[]
  volets: Volet[]
  appareils: AppareilFixe[]
  onOpen: (pieceId: string) => void
  onCreate: () => void
}) {
  const byNiveau = useMemo(() => {
    const map = new Map<Niveau, Piece[]>()
    for (const n of NIVEAUX) map.set(n, [])
    for (const p of pieces) {
      const arr = map.get(p.niveau)
      if (arr) arr.push(p)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    }
    return map
  }, [pieces])

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Pièces
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {pieces.length} pièce{pieces.length > 1 ? 's' : ''} référencée
            {pieces.length > 1 ? 's' : ''}. Cliquez sur une carte pour ouvrir le
            détail.
          </p>
        </div>
        <button
          onClick={onCreate}
          className="text-sm rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-1.5"
        >
          + Ajouter une pièce
        </button>
      </div>

      {NIVEAUX.map((niveau) => {
        const list = byNiveau.get(niveau) ?? []
        if (list.length === 0) return null
        return (
          <section key={niveau} className="mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
              {niveau}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((p) => {
                const ec = countEndpoints(p.id, endpoints)
                const nbEndpoints =
                  ec.PC + ec.PD + ec.PL + ec.IN + ec.BT + ec.RJ45 + ec.TV + ec.AUTRE
                const nbVolets = countVolets(p.id, volets)
                const nbAppareils = countAppareils(p.id, appareils)
                return (
                  <button
                    key={p.id}
                    onClick={() => onOpen(p.id)}
                    className="text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold">{p.nom}</h3>
                        <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          {p.trigramme}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 text-[10px] uppercase rounded-full px-2 py-0.5 ${categorieStyle(p.categorie)}`}
                      >
                        {categorieLabel(p.categorie)}
                      </span>
                    </div>

                    <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <Stat label="End-points" value={nbEndpoints} />
                      <Stat label="Volets" value={nbVolets} />
                      <Stat label="Appareils" value={nbAppareils} />
                    </dl>

                    {nbEndpoints > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                        {ec.PC > 0 && <Chip>PC × {ec.PC}</Chip>}
                        {ec.PD > 0 && <Chip>PD × {ec.PD}</Chip>}
                        {ec.PL > 0 && <Chip>PL × {ec.PL}</Chip>}
                        {ec.IN > 0 && <Chip>IN × {ec.IN}</Chip>}
                        {ec.BT > 0 && <Chip>BT × {ec.BT}</Chip>}
                        {ec.RJ45 > 0 && <Chip>RJ45 × {ec.RJ45}</Chip>}
                        {ec.TV > 0 && <Chip>TV × {ec.TV}</Chip>}
                        {ec.AUTRE > 0 && <Chip>? × {ec.AUTRE}</Chip>}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">
      {children}
    </span>
  )
}

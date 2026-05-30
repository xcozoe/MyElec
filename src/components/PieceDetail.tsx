import { useMemo } from 'react'
import type { Store } from '../hooks/useStore'
import type {
  AppareilFixe,
  EndPoint,
  EndPointType,
  Volet,
} from '../types/electrical'
import {
  CATEGORIES_APPAREIL,
  endpointTypeLabel,
  murLabel,
} from '../types/electrical'
import { clickableRowProps } from '../utils/form'

interface Props {
  pieceId: string
  store: Store
  onBack: () => void
  onEditPiece: () => void
  onCreateEndpoint?: (type?: EndPointType) => void
  onEditEndpoint?: (endpointId: string) => void
  onCreateAppareil?: () => void
  onEditAppareil?: (appareilId: string) => void
  onCreateVolet?: () => void
  onEditVolet?: (voletId: string) => void
  onOpenLigne?: (ligneId: string) => void
}

export function PieceDetail({
  pieceId,
  store,
  onBack,
  onEditPiece,
  onCreateEndpoint,
  onEditEndpoint,
  onCreateAppareil,
  onEditAppareil,
  onCreateVolet,
  onEditVolet,
  onOpenLigne,
}: Props) {
  const piece = store.pieces.find((p) => p.id === pieceId)

  const pieceEndpoints = useMemo(
    () => store.endpoints.filter((e) => e.piece_id === pieceId),
    [store.endpoints, pieceId],
  )
  const pieceVolets = useMemo(
    () => store.volets.filter((v) => v.piece_id === pieceId),
    [store.volets, pieceId],
  )
  const pieceAppareils = useMemo(
    () => store.appareils.filter((a) => a.piece_id === pieceId),
    [store.appareils, pieceId],
  )

  if (!piece) {
    return (
      <div>
        <button
          onClick={onBack}
          className="text-sm text-slate-500 dark:text-slate-400 hover:underline"
        >
          ← Retour
        </button>
        <div className="mt-4">Pièce introuvable.</div>
      </div>
    )
  }

  const groups: { title: string; types: EndPointType[] }[] = [
    { title: 'Prises', types: ['PC', 'PD'] },
    { title: 'Éclairage', types: ['ECL'] },
    { title: 'Commandes', types: ['IN', 'BT'] },
    { title: 'Réseau & TV', types: ['RJ45', 'TV'] },
    { title: 'Autres', types: ['AUTRE'] },
  ]

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <button
          onClick={onBack}
          className="text-sm text-slate-500 dark:text-slate-400 hover:underline"
        >
          ← Pièces
        </button>
        <button
          onClick={onEditPiece}
          className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5"
        >
          Éditer la pièce
        </button>
      </div>

      <header className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{piece.nom}</h1>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {piece.niveau} ·{' '}
              <code className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">
                {piece.trigramme}
              </code>
              {piece.surface_m2 !== undefined && (
                <> · {piece.surface_m2} m²</>
              )}
            </div>
          </div>
        </div>
        {piece.notes && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            {piece.notes}
          </p>
        )}
      </header>

      <div className="space-y-4">
        {groups.map((g) => {
          const items = pieceEndpoints.filter((e) => g.types.includes(e.type))
          return (
            <Section
              key={g.title}
              title={g.title}
              count={items.length}
              onCreate={
                onCreateEndpoint
                  ? () => onCreateEndpoint(g.types[0])
                  : undefined
              }
            >
              {items.length === 0 ? (
                <Empty>
                  Aucun {g.title.toLowerCase()} renseigné.
                </Empty>
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                  {items.map((e) => (
                    <EndpointRow
                      key={e.id}
                      e={e}
                      onClick={() => onEditEndpoint?.(e.id)}
                      onOpenLigne={onOpenLigne}
                    />
                  ))}
                </ul>
              )}
            </Section>
          )
        })}

        <Section
          title="Volets & stores"
          count={pieceVolets.length}
          onCreate={onCreateVolet}
        >
          {pieceVolets.length === 0 ? (
            <Empty>Aucun volet ou store renseigné.</Empty>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {pieceVolets.map((v) => (
                <VoletRow
                  key={v.id}
                  v={v}
                  onClick={() => onEditVolet?.(v.id)}
                  onOpenLigne={onOpenLigne}
                />
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Appareils fixes"
          count={pieceAppareils.length}
          onCreate={onCreateAppareil}
        >
          {pieceAppareils.length === 0 ? (
            <Empty>Aucun appareil fixe renseigné.</Empty>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {pieceAppareils.map((a) => (
                <AppareilRow
                  key={a.id}
                  a={a}
                  onClick={() => onEditAppareil?.(a.id)}
                  onOpenLigne={onOpenLigne}
                  endpoints={store.endpoints}
                />
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  )
}

function Section({
  title,
  count,
  onCreate,
  children,
}: {
  title: string
  count: number
  onCreate?: () => void
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-semibold">
          {title}
          {count > 0 && (
            <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
              {count}
            </span>
          )}
        </h3>
        {onCreate && (
          <button
            onClick={onCreate}
            className="text-xs rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1"
          >
            + Ajouter
          </button>
        )}
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

function EndpointRow({
  e,
  onClick,
  onOpenLigne,
}: {
  e: EndPoint
  onClick?: () => void
  onOpenLigne?: (ligneId: string) => void
}) {
  const sansFil =
    (e.type === 'IN' || e.type === 'BT') &&
    e.alimentation &&
    e.alimentation !== 'filaire'
  return (
    <li
      {...(onClick ? clickableRowProps(onClick) : {})}
      className={
        'px-4 py-2 flex items-center gap-3 ' +
        (onClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : '')
      }
    >
      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 w-32 shrink-0 truncate">
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
          {murLabel(e.mur)} · n°{e.numero}
          {e.position_detail && <> · {e.position_detail}</>}
        </div>
      </div>
      {sansFil && (
        <span
          className="text-[10px] uppercase rounded bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 px-2 py-0.5"
          title={e.alimentation === 'pile' ? 'Sans-fil — pile' : 'Sans-fil — autonome'}
        >
          {e.alimentation}
        </span>
      )}
      {e.ligne_id && onOpenLigne && (
        <button
          onClick={(ev) => {
            ev.stopPropagation()
            onOpenLigne(e.ligne_id!)
          }}
          className="text-xs rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          {e.ligne_id}
        </button>
      )}
    </li>
  )
}

function VoletRow({
  v,
  onClick,
  onOpenLigne,
}: {
  v: Volet
  onClick?: () => void
  onOpenLigne?: (ligneId: string) => void
}) {
  return (
    <li
      {...(onClick ? clickableRowProps(onClick) : {})}
      className={
        'px-4 py-2 flex items-center gap-3 ' +
        (onClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : '')
      }
    >
      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 w-32 shrink-0 truncate">
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
      {v.ligne_id && onOpenLigne && (
        <button
          onClick={(ev) => {
            ev.stopPropagation()
            onOpenLigne(v.ligne_id!)
          }}
          className="text-xs rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          {v.ligne_id}
        </button>
      )}
    </li>
  )
}

function AppareilRow({
  a,
  onClick,
  onOpenLigne,
  endpoints,
}: {
  a: AppareilFixe
  onClick?: () => void
  onOpenLigne?: (ligneId: string) => void
  endpoints: EndPoint[]
}) {
  const categorieLabel =
    CATEGORIES_APPAREIL.find((c) => c.value === a.categorie)?.label ?? a.categorie
  const brancheEndpoint = a.branche_sur
    ? endpoints.find((e) => e.id === a.branche_sur)
    : undefined
  return (
    <li
      {...(onClick ? clickableRowProps(onClick) : {})}
      className={
        'px-4 py-2 flex items-center gap-3 ' +
        (onClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : '')
      }
    >
      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 w-32 shrink-0 truncate">
        {a.id}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{a.nom}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {categorieLabel} · {a.profil_usage}
          {a.puissance_nominale_w && <> · {a.puissance_nominale_w} W</>}
          {a.marque && <> · {a.marque}</>}
        </div>
        {a.branche_sur && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Branché sur{' '}
            <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">
              {a.branche_sur}
            </code>
            {brancheEndpoint && (
              <> ({endpointTypeLabel(brancheEndpoint.type)})</>
            )}
          </div>
        )}
      </div>
      {a.ligne_id && onOpenLigne && (
        <button
          onClick={(ev) => {
            ev.stopPropagation()
            onOpenLigne(a.ligne_id!)
          }}
          className="text-xs rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          {a.ligne_id}
        </button>
      )}
    </li>
  )
}

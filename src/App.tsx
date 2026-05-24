import { useEffect, useState } from 'react'
import { TableauList } from './components/TableauList'
import { TableauDetail } from './components/TableauDetail'
import { HistoriqueView } from './components/HistoriqueView'
import { CartographieEnCours } from './components/CartographieEnCours'
import { ExportImport } from './components/ExportImport'
import { PieceList } from './components/PieceList'
import { PieceDetail } from './components/PieceDetail'
import { PieceEditor } from './components/PieceEditor'
import { EndPointEditor, emptyEndPoint } from './components/EndPointEditor'
import { SearchBar } from './components/SearchBar'
import { SidePanel } from './components/SidePanel'
import { useStore } from './hooks/useStore'
import type { EndPointType, Piece } from './types/electrical'

export type View =
  | { name: 'home' }
  | { name: 'tableau'; tableauId: string; focusDisjoncteurId?: string }
  | { name: 'pieces' }
  | { name: 'piece'; pieceId: string }
  | { name: 'historique' }
  | { name: 'cartographie' }

type PiecePanel =
  | { kind: 'none' }
  | { kind: 'createPiece' }
  | { kind: 'editPiece'; pieceId: string }
  | {
      kind: 'createEndpoint'
      pieceId: string
      type: EndPointType
    }
  | { kind: 'editEndpoint'; endpointId: string }

const DARK_KEY = 'myelec.dark'

function emptyPiece(): Piece {
  return {
    id: '',
    trigramme: '',
    nom: '',
    niveau: 'Rez de jardin',
    categorie: 'interieur',
  }
}

export function App() {
  const state = useStore()
  const [view, setView] = useState<View>({ name: 'home' })
  const [piecePanel, setPiecePanel] = useState<PiecePanel>({ kind: 'none' })
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return false
    const stored = localStorage.getItem(DARK_KEY)
    if (stored !== null) return stored === '1'
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(DARK_KEY, dark ? '1' : '0')
  }, [dark])

  const goTo = (next: View) => setView(next)

  const closePiecePanel = () => setPiecePanel({ kind: 'none' })

  const renderPiecePanel = () => {
    if (piecePanel.kind === 'createPiece') {
      return (
        <PieceEditor
          mode="create"
          initial={emptyPiece()}
          allPieces={state.pieces}
          onSave={async (next, desc) => {
            await state.pieceOps.upsert(next, desc)
            closePiecePanel()
          }}
          onCancel={closePiecePanel}
        />
      )
    }
    if (piecePanel.kind === 'createEndpoint') {
      const initial = emptyEndPoint(
        piecePanel.pieceId,
        state.pieces,
        state.endpoints,
        piecePanel.type,
      )
      return (
        <EndPointEditor
          mode="create"
          initial={initial}
          pieces={state.pieces}
          lignes={state.lignes}
          allEndpoints={state.endpoints}
          onSave={async (next, desc, options) => {
            await state.endpointOps.upsert(next, desc)
            if (options?.thenNew) {
              // On garde le panneau ouvert sur un nouveau formulaire vide
              // (saisie rapide pour le terrain).
              setPiecePanel({
                kind: 'createEndpoint',
                pieceId: next.piece_id,
                type: next.type,
              })
            } else {
              closePiecePanel()
            }
          }}
          onCancel={closePiecePanel}
        />
      )
    }
    if (piecePanel.kind === 'editEndpoint') {
      const ep = state.endpoints.find((x) => x.id === piecePanel.endpointId)
      if (!ep) return <div>End-point introuvable.</div>
      return (
        <EndPointEditor
          mode="edit"
          initial={ep}
          pieces={state.pieces}
          lignes={state.lignes}
          allEndpoints={state.endpoints}
          onSave={async (next, desc) => {
            await state.endpointOps.upsert(next, desc)
            closePiecePanel()
          }}
          onDelete={async () => {
            await state.endpointOps.remove(
              ep.id,
              `Suppression de l'end-point ${ep.id}.`,
            )
            closePiecePanel()
          }}
          onCancel={closePiecePanel}
        />
      )
    }
    if (piecePanel.kind === 'editPiece') {
      const piece = state.pieces.find((p) => p.id === piecePanel.pieceId)
      if (!piece) return <div>Pièce introuvable.</div>
      return (
        <PieceEditor
          mode="edit"
          initial={piece}
          allPieces={state.pieces}
          onSave={async (next, desc) => {
            await state.pieceOps.upsert(next, desc)
            closePiecePanel()
          }}
          onDelete={async () => {
            const nbEp = state.endpoints.filter((e) => e.piece_id === piece.id).length
            const nbVo = state.volets.filter((v) => v.piece_id === piece.id).length
            const nbAp = state.appareils.filter((a) => a.piece_id === piece.id).length
            if (nbEp + nbVo + nbAp > 0) {
              const ok = confirm(
                `Cette pièce contient ${nbEp} end-point(s), ${nbVo} volet(s) et ${nbAp} appareil(s). Supprimer la pièce ne supprime PAS ces éléments — ils deviendront orphelins. Continuer ?`,
              )
              if (!ok) return
            }
            await state.pieceOps.remove(
              piece.id,
              `Suppression de la pièce ${piece.nom} (${piece.trigramme}).`,
            )
            closePiecePanel()
            if (view.name === 'piece' && view.pieceId === piece.id) {
              goTo({ name: 'pieces' })
            }
          }}
          onCancel={closePiecePanel}
        />
      )
    }
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => goTo({ name: 'home' })}
            className="text-lg sm:text-xl font-semibold tracking-tight hover:opacity-80"
          >
            ⚡ MyElec
          </button>

          <nav className="flex flex-wrap gap-1 text-sm">
            <NavButton
              active={view.name === 'home' || view.name === 'tableau'}
              onClick={() => goTo({ name: 'home' })}
            >
              Tableaux
            </NavButton>
            <NavButton
              active={view.name === 'pieces' || view.name === 'piece'}
              onClick={() => goTo({ name: 'pieces' })}
            >
              Pièces
            </NavButton>
            <NavButton
              active={view.name === 'cartographie'}
              onClick={() => goTo({ name: 'cartographie' })}
            >
              Cartographie
            </NavButton>
            <NavButton
              active={view.name === 'historique'}
              onClick={() => goTo({ name: 'historique' })}
            >
              Historique
            </NavButton>
          </nav>

          <div className="flex-1 min-w-[12rem]">
            <SearchBar
              tableaux={state.tableaux}
              onSelect={(hit) =>
                goTo({
                  name: 'tableau',
                  tableauId: hit.tableauId,
                  focusDisjoncteurId: hit.disjoncteurId,
                })
              }
            />
          </div>

          <ExportImport state={state} />

          <button
            onClick={() => setDark((d) => !d)}
            className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Basculer le mode sombre"
          >
            {dark ? 'Clair' : 'Sombre'}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        {state.error && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40 text-red-800 dark:text-red-200 px-4 py-3 text-sm">
            <strong>Erreur :</strong> {state.error}
            <button onClick={() => state.reload()} className="ml-2 underline">
              Recharger
            </button>
          </div>
        )}

        {state.loading && state.tableaux.length === 0 ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm">
            Chargement…
          </div>
        ) : view.name === 'home' ? (
          <TableauList
            tableaux={state.tableaux}
            onOpen={(id) => goTo({ name: 'tableau', tableauId: id })}
          />
        ) : view.name === 'tableau' ? (
          <TableauDetail
            tableauId={view.tableauId}
            focusDisjoncteurId={view.focusDisjoncteurId}
            state={state}
            onBack={() => goTo({ name: 'home' })}
          />
        ) : view.name === 'pieces' ? (
          <PieceList
            pieces={state.pieces}
            endpoints={state.endpoints}
            volets={state.volets}
            appareils={state.appareils}
            onOpen={(id) => goTo({ name: 'piece', pieceId: id })}
            onCreate={() => setPiecePanel({ kind: 'createPiece' })}
          />
        ) : view.name === 'piece' ? (
          <PieceDetail
            pieceId={view.pieceId}
            store={state}
            onBack={() => goTo({ name: 'pieces' })}
            onEditPiece={() =>
              setPiecePanel({ kind: 'editPiece', pieceId: view.pieceId })
            }
            onCreateEndpoint={(type) =>
              setPiecePanel({
                kind: 'createEndpoint',
                pieceId: view.pieceId,
                type: type ?? 'PC',
              })
            }
            onEditEndpoint={(endpointId) =>
              setPiecePanel({ kind: 'editEndpoint', endpointId })
            }
          />
        ) : view.name === 'historique' ? (
          <HistoriqueView
            modifications={state.modifications}
            tableaux={state.tableaux}
            onOpenEntite={(tableauId, disjoncteurId) =>
              goTo({
                name: 'tableau',
                tableauId,
                focusDisjoncteurId: disjoncteurId,
              })
            }
          />
        ) : (
          <CartographieEnCours
            state={state}
            onOpen={(tableauId, disjoncteurId) =>
              goTo({
                name: 'tableau',
                tableauId,
                focusDisjoncteurId: disjoncteurId,
              })
            }
          />
        )}
      </main>

      <footer className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-xs text-slate-500 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800">
        MyElec — base de référence locale (données dans data/*.json)
      </footer>

      <SidePanel
        open={piecePanel.kind !== 'none'}
        onClose={closePiecePanel}
      >
        {renderPiecePanel()}
      </SidePanel>
    </div>
  )
}

function NavButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? 'rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-1.5'
          : 'rounded-md px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800'
      }
    >
      {children}
    </button>
  )
}

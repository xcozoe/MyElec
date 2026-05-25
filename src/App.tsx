import { useEffect, useState } from 'react'
import { TableauDetail } from './components/TableauDetail'
import { PieceList } from './components/PieceList'
import { PieceDetail } from './components/PieceDetail'
import { PieceEditor } from './components/PieceEditor'
import { EndPointEditor, emptyEndPoint } from './components/EndPointEditor'
import { CheminementView } from './components/CheminementView'
import { LigneList } from './components/LigneList'
import { LigneDetail } from './components/LigneDetail'
import { LigneEditor, emptyLigne } from './components/LigneEditor'
import { SettingsView } from './components/SettingsView'
import { EquipementList } from './components/EquipementList'
import { AppareilFixeEditor, emptyAppareil } from './components/AppareilFixeEditor'
import { VoletEditor, emptyVolet } from './components/VoletEditor'
import { SearchOverlay } from './components/SearchOverlay'
import { SidePanel } from './components/SidePanel'
import { useStore } from './hooks/useStore'
import type { EndPointType, Piece } from './types/electrical'

export type View =
  | { name: 'home' }
  | { name: 'tableau'; tableauId: string; focusDisjoncteurId?: string }
  | { name: 'pieces' }
  | { name: 'piece'; pieceId: string }
  | { name: 'lignes' }
  | { name: 'ligne'; ligneId: string }
  | { name: 'equipements' }
  | { name: 'settings' }

type Panel =
  | { kind: 'none' }
  | { kind: 'createPiece' }
  | { kind: 'editPiece'; pieceId: string }
  | {
      kind: 'createEndpoint'
      pieceId: string
      type: EndPointType
    }
  | { kind: 'editEndpoint'; endpointId: string }
  | { kind: 'createLigne' }
  | { kind: 'editLigne'; ligneId: string }
  | { kind: 'createAppareil'; pieceId?: string }
  | { kind: 'editAppareil'; appareilId: string }
  | { kind: 'createVolet'; pieceId?: string }
  | { kind: 'editVolet'; voletId: string }

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
  const [panel, setPanel] = useState<Panel>({ kind: 'none' })
  const [searchOpen, setSearchOpen] = useState(false)
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

  const closePanel = () => setPanel({ kind: 'none' })

  const renderPanel = () => {
    if (panel.kind === 'createPiece') {
      return (
        <PieceEditor
          mode="create"
          initial={emptyPiece()}
          allPieces={state.pieces}
          onSave={async (next, desc) => {
            await state.pieceOps.upsert(next, desc)
            closePanel()
          }}
          onCancel={closePanel}
        />
      )
    }
    if (panel.kind === 'createEndpoint') {
      const initial = emptyEndPoint(
        panel.pieceId,
        state.pieces,
        state.endpoints,
        panel.type,
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
              setPanel({
                kind: 'createEndpoint',
                pieceId: next.piece_id,
                type: next.type,
              })
            } else {
              closePanel()
            }
          }}
          onCancel={closePanel}
        />
      )
    }
    if (panel.kind === 'editEndpoint') {
      const ep = state.endpoints.find((x) => x.id === panel.endpointId)
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
            closePanel()
          }}
          onDelete={async () => {
            await state.endpointOps.remove(
              ep.id,
              `Suppression de l'end-point ${ep.id}.`,
            )
            closePanel()
          }}
          onCancel={closePanel}
        />
      )
    }
    if (panel.kind === 'createLigne') {
      return (
        <LigneEditor
          mode="create"
          initial={emptyLigne()}
          tableaux={state.tableaux}
          allLignes={state.lignes}
          onSave={async (next, desc, options) => {
            await state.ligneOps.upsert(next, desc)
            if (options?.thenNew) {
              setPanel({ kind: 'createLigne' })
            } else {
              closePanel()
            }
          }}
          onCancel={closePanel}
        />
      )
    }
    if (panel.kind === 'editLigne') {
      const ligne = state.lignes.find((l) => l.id === panel.ligneId)
      if (!ligne) return <div>Ligne introuvable.</div>
      const currentId = ligne.id
      return (
        <LigneEditor
          mode="edit"
          initial={ligne}
          tableaux={state.tableaux}
          allLignes={state.lignes}
          onSave={async (next, desc) => {
            await state.editLigne(currentId, next, desc)
            closePanel()
            // Si on est sur la vue détail de la ligne et qu'elle a été renommée,
            // mettre à jour l'URL/view pour pointer sur le nouvel ID.
            if (
              view.name === 'ligne' &&
              view.ligneId === currentId &&
              currentId !== next.id
            ) {
              goTo({ name: 'ligne', ligneId: next.id })
            }
          }}
          onDelete={async () => {
            await state.ligneOps.remove(
              ligne.id,
              `Suppression de la ligne ${ligne.id} (${ligne.libelle}).`,
            )
            closePanel()
            if (view.name === 'ligne' && view.ligneId === ligne.id) {
              goTo({ name: 'lignes' })
            }
          }}
          onCancel={closePanel}
        />
      )
    }
    if (panel.kind === 'createAppareil') {
      const pieceId =
        panel.pieceId ?? state.pieces[0]?.id ?? ''
      return (
        <AppareilFixeEditor
          mode="create"
          initial={emptyAppareil(pieceId, state.pieces, state.appareils)}
          pieces={state.pieces}
          lignes={state.lignes}
          endpoints={state.endpoints}
          allAppareils={state.appareils}
          onSave={async (next, desc, options) => {
            await state.appareilOps.upsert(next, desc)
            if (options?.thenNew) {
              setPanel({ kind: 'createAppareil', pieceId: next.piece_id })
            } else {
              closePanel()
            }
          }}
          onCancel={closePanel}
        />
      )
    }
    if (panel.kind === 'editAppareil') {
      const ap = state.appareils.find((x) => x.id === panel.appareilId)
      if (!ap) return <div>Appareil introuvable.</div>
      return (
        <AppareilFixeEditor
          mode="edit"
          initial={ap}
          pieces={state.pieces}
          lignes={state.lignes}
          endpoints={state.endpoints}
          allAppareils={state.appareils}
          onSave={async (next, desc) => {
            await state.appareilOps.upsert(next, desc)
            closePanel()
          }}
          onDelete={async () => {
            await state.appareilOps.remove(
              ap.id,
              `Suppression de l'appareil ${ap.id} (${ap.nom}).`,
            )
            closePanel()
          }}
          onCancel={closePanel}
        />
      )
    }
    if (panel.kind === 'createVolet') {
      const pieceId =
        panel.pieceId ?? state.pieces[0]?.id ?? ''
      return (
        <VoletEditor
          mode="create"
          initial={emptyVolet(pieceId, state.pieces, state.volets)}
          pieces={state.pieces}
          lignes={state.lignes}
          allVolets={state.volets}
          onSave={async (next, desc, options) => {
            await state.voletOps.upsert(next, desc)
            if (options?.thenNew) {
              setPanel({ kind: 'createVolet', pieceId: next.piece_id })
            } else {
              closePanel()
            }
          }}
          onCancel={closePanel}
        />
      )
    }
    if (panel.kind === 'editVolet') {
      const vo = state.volets.find((x) => x.id === panel.voletId)
      if (!vo) return <div>Volet introuvable.</div>
      return (
        <VoletEditor
          mode="edit"
          initial={vo}
          pieces={state.pieces}
          lignes={state.lignes}
          allVolets={state.volets}
          onSave={async (next, desc) => {
            await state.voletOps.upsert(next, desc)
            closePanel()
          }}
          onDelete={async () => {
            await state.voletOps.remove(
              vo.id,
              `Suppression du volet ${vo.id}.`,
            )
            closePanel()
          }}
          onCancel={closePanel}
        />
      )
    }
    if (panel.kind === 'editPiece') {
      const piece = state.pieces.find((p) => p.id === panel.pieceId)
      if (!piece) return <div>Pièce introuvable.</div>
      return (
        <PieceEditor
          mode="edit"
          initial={piece}
          allPieces={state.pieces}
          onSave={async (next, desc) => {
            await state.pieceOps.upsert(next, desc)
            closePanel()
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
            closePanel()
            if (view.name === 'piece' && view.pieceId === piece.id) {
              goTo({ name: 'pieces' })
            }
          }}
          onCancel={closePanel}
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

          <nav className="hidden sm:flex flex-wrap gap-1 text-sm">
            <NavButton
              active={view.name === 'home' || view.name === 'tableau'}
              onClick={() => goTo({ name: 'home' })}
            >
              Accueil
            </NavButton>
            <NavButton
              active={view.name === 'pieces' || view.name === 'piece'}
              onClick={() => goTo({ name: 'pieces' })}
            >
              Pièces
            </NavButton>
            <NavButton
              active={view.name === 'lignes' || view.name === 'ligne'}
              onClick={() => goTo({ name: 'lignes' })}
            >
              Lignes
            </NavButton>
            <NavButton
              active={view.name === 'equipements'}
              onClick={() => goTo({ name: 'equipements' })}
            >
              Équipements
            </NavButton>
          </nav>

          <div className="flex-1" />

          <button
            onClick={() => setSearchOpen(true)}
            className="rounded-full p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            aria-label="Ouvrir la recherche"
            title="Rechercher"
          >
            <SearchIconSvg className="h-5 w-5" />
          </button>

          <button
            onClick={() => goTo({ name: 'settings' })}
            className={`rounded-full p-2 transition-colors ${
              view.name === 'settings'
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            aria-label="Ouvrir les paramètres"
            title="Paramètres"
          >
            <GearIconSvg className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-[calc(env(safe-area-inset-bottom)+5rem)] sm:pb-6">
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
          <CheminementView
            store={state}
            onOpenTableau={(tableauId, focusDisjoncteurId) =>
              goTo({ name: 'tableau', tableauId, focusDisjoncteurId })
            }
          />
        ) : view.name === 'tableau' ? (
          <TableauDetail
            tableauId={view.tableauId}
            focusDisjoncteurId={view.focusDisjoncteurId}
            state={state}
            onBack={() => goTo({ name: 'home' })}
            onOpenLigne={(ligneId) => goTo({ name: 'ligne', ligneId })}
          />
        ) : view.name === 'pieces' ? (
          <PieceList
            pieces={state.pieces}
            endpoints={state.endpoints}
            volets={state.volets}
            appareils={state.appareils}
            onOpen={(id) => goTo({ name: 'piece', pieceId: id })}
            onCreate={() => setPanel({ kind: 'createPiece' })}
          />
        ) : view.name === 'piece' ? (
          <PieceDetail
            pieceId={view.pieceId}
            store={state}
            onBack={() => goTo({ name: 'pieces' })}
            onEditPiece={() =>
              setPanel({ kind: 'editPiece', pieceId: view.pieceId })
            }
            onCreateEndpoint={(type) =>
              setPanel({
                kind: 'createEndpoint',
                pieceId: view.pieceId,
                type: type ?? 'PC',
              })
            }
            onEditEndpoint={(endpointId) =>
              setPanel({ kind: 'editEndpoint', endpointId })
            }
            onCreateAppareil={() =>
              setPanel({ kind: 'createAppareil', pieceId: view.pieceId })
            }
            onEditAppareil={(appareilId) =>
              setPanel({ kind: 'editAppareil', appareilId })
            }
            onCreateVolet={() =>
              setPanel({ kind: 'createVolet', pieceId: view.pieceId })
            }
            onEditVolet={(voletId) =>
              setPanel({ kind: 'editVolet', voletId })
            }
            onOpenLigne={(ligneId) => goTo({ name: 'ligne', ligneId })}
          />
        ) : view.name === 'lignes' ? (
          <LigneList
            lignes={state.lignes}
            tableaux={state.tableaux}
            endpoints={state.endpoints}
            appareils={state.appareils}
            pieces={state.pieces}
            onOpen={(id) => goTo({ name: 'ligne', ligneId: id })}
            onCreate={() => setPanel({ kind: 'createLigne' })}
          />
        ) : view.name === 'ligne' ? (
          <LigneDetail
            ligneId={view.ligneId}
            store={state}
            onBack={() => goTo({ name: 'lignes' })}
            onEditLigne={() =>
              setPanel({ kind: 'editLigne', ligneId: view.ligneId })
            }
            onOpenDisjoncteur={(tableauId, disjoncteurId) =>
              goTo({
                name: 'tableau',
                tableauId,
                focusDisjoncteurId: disjoncteurId,
              })
            }
            onOpenEndpoint={(endpointId) =>
              setPanel({ kind: 'editEndpoint', endpointId })
            }
            onOpenAppareil={(appareilId) =>
              setPanel({ kind: 'editAppareil', appareilId })
            }
            onOpenPiece={(pieceId) => goTo({ name: 'piece', pieceId })}
          />
        ) : view.name === 'equipements' ? (
          <EquipementList
            appareils={state.appareils}
            volets={state.volets}
            pieces={state.pieces}
            lignes={state.lignes}
            endpoints={state.endpoints}
            onOpenAppareil={(id) => setPanel({ kind: 'editAppareil', appareilId: id })}
            onCreateAppareil={() => setPanel({ kind: 'createAppareil' })}
            onOpenVolet={(id) => setPanel({ kind: 'editVolet', voletId: id })}
            onCreateVolet={() => setPanel({ kind: 'createVolet' })}
            onOpenLigne={(ligneId) => goTo({ name: 'ligne', ligneId })}
            onOpenPiece={(pieceId) => goTo({ name: 'piece', pieceId })}
          />
        ) : (
          <SettingsView
            store={state}
            dark={dark}
            setDark={setDark}
            onOpenTableau={(tableauId, focusDisjoncteurId) =>
              goTo({ name: 'tableau', tableauId, focusDisjoncteurId })
            }
          />
        )}
      </main>

      <footer className="hidden sm:block max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-xs text-slate-500 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800">
        MyElec — base de référence locale (données dans data/*.json)
      </footer>

      <nav
        aria-label="Navigation principale"
        className="sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-4">
          <BottomTab
            icon={<HomeIconSvg className="h-6 w-6" />}
            label="Accueil"
            active={view.name === 'home' || view.name === 'tableau'}
            onClick={() => goTo({ name: 'home' })}
          />
          <BottomTab
            icon={<SquaresIconSvg className="h-6 w-6" />}
            label="Pièces"
            active={view.name === 'pieces' || view.name === 'piece'}
            onClick={() => goTo({ name: 'pieces' })}
          />
          <BottomTab
            icon={<BoltIconSvg className="h-6 w-6" />}
            label="Lignes"
            active={view.name === 'lignes' || view.name === 'ligne'}
            onClick={() => goTo({ name: 'lignes' })}
          />
          <BottomTab
            icon={<CubeIconSvg className="h-6 w-6" />}
            label="Équipements"
            active={view.name === 'equipements'}
            onClick={() => goTo({ name: 'equipements' })}
          />
        </div>
      </nav>

      <SidePanel
        open={panel.kind !== 'none'}
        onClose={closePanel}
      >
        {renderPanel()}
      </SidePanel>

      {searchOpen && (
        <SearchOverlay
          data={{
            tableaux: state.tableaux,
            pieces: state.pieces,
            lignes: state.lignes,
            endpoints: state.endpoints,
            appareils: state.appareils,
            volets: state.volets,
          }}
          onClose={() => setSearchOpen(false)}
          onSelect={(hit) => {
            switch (hit.type) {
              case 'tableau':
              case 'rangee':
                if (hit.tableauId)
                  goTo({ name: 'tableau', tableauId: hit.tableauId })
                return
              case 'disjoncteur':
                if (hit.tableauId)
                  goTo({
                    name: 'tableau',
                    tableauId: hit.tableauId,
                    focusDisjoncteurId: hit.disjoncteurId,
                  })
                return
              case 'piece':
                if (hit.pieceId) goTo({ name: 'piece', pieceId: hit.pieceId })
                return
              case 'ligne':
                if (hit.ligneId) goTo({ name: 'ligne', ligneId: hit.ligneId })
                return
              case 'endpoint':
                if (hit.endpointId)
                  setPanel({ kind: 'editEndpoint', endpointId: hit.endpointId })
                return
              case 'appareil':
                if (hit.appareilId)
                  setPanel({ kind: 'editAppareil', appareilId: hit.appareilId })
                return
              case 'volet':
                if (hit.voletId)
                  setPanel({ kind: 'editVolet', voletId: hit.voletId })
                return
            }
          }}
        />
      )}
    </div>
  )
}

function SearchIconSvg({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  )
}

function GearIconSvg({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.213-1.281Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
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
          ? 'rounded-full bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white px-3 py-1.5 font-medium transition-colors'
          : 'rounded-full px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 transition-colors'
      }
    >
      {children}
    </button>
  )
}

function BottomTab({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
        active
          ? 'text-slate-900 dark:text-white'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      <span className={active ? '' : 'opacity-80'}>{icon}</span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  )
}

function HomeIconSvg({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  )
}

function SquaresIconSvg({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
      />
    </svg>
  )
}

function BoltIconSvg({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
      />
    </svg>
  )
}

function CubeIconSvg({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
      />
    </svg>
  )
}

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
import { CheminementView } from './components/CheminementView'
import { LigneList } from './components/LigneList'
import { LigneDetail } from './components/LigneDetail'
import { LigneEditor, emptyLigne } from './components/LigneEditor'
import { SettingsPanel } from './components/SettingsPanel'
import { EquipementList } from './components/EquipementList'
import { AppareilFixeEditor, emptyAppareil } from './components/AppareilFixeEditor'
import { VoletEditor, emptyVolet } from './components/VoletEditor'
import { SearchBar } from './components/SearchBar'
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
  | { name: 'cheminement' }
  | { name: 'historique' }
  | { name: 'cartographie' }

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
  | { kind: 'settings' }

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
    if (panel.kind === 'settings') {
      return <SettingsPanel onClose={closePanel} />
    }
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
            <NavButton
              active={view.name === 'cheminement'}
              onClick={() => goTo({ name: 'cheminement' })}
            >
              Cheminement
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
              data={{
                tableaux: state.tableaux,
                pieces: state.pieces,
                lignes: state.lignes,
                endpoints: state.endpoints,
                appareils: state.appareils,
                volets: state.volets,
              }}
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
          </div>

          <ExportImport state={state} />

          <button
            onClick={() => setPanel({ kind: 'settings' })}
            className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Ouvrir les paramètres"
          >
            Paramètres
          </button>

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
        ) : view.name === 'cheminement' ? (
          <CheminementView
            store={state}
            onOpenTableau={(tableauId, focusDisjoncteurId) =>
              goTo({ name: 'tableau', tableauId, focusDisjoncteurId })
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
        open={panel.kind !== 'none'}
        onClose={closePanel}
      >
        {renderPanel()}
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

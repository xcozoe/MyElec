import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Lightbox } from './Lightbox'
import type {
  Disjoncteur,
  Ligne,
  Rangee,
  Tableau,
} from '../types/electrical'
import type { Store } from '../hooks/useStore'
import { PHASE_STYLES } from '../utils/phaseStyle'
import { ligneIdFromDisjoncteur } from '../utils/idGenerator'
import { DisjoncteurEditor } from './DisjoncteurEditor'
import { LigneEditor } from './LigneEditor'
import { RangeeEditor } from './RangeeEditor'
import { RangeeView } from './RangeeView'
import { SidePanel } from './SidePanel'
import { TableauEditor } from './TableauEditor'
import { useConfirm } from './Dialogs'

type PanelState =
  | { kind: 'none' }
  | { kind: 'editDisjoncteur'; rangeeId: string; disjoncteurId: string }
  | { kind: 'createDisjoncteur'; rangeeId: string }
  | { kind: 'editRangee'; rangeeId: string }
  | { kind: 'createRangee' }
  | { kind: 'editTableau' }
  | {
      kind: 'createLigne'
      initial: Ligne
      // Pour revenir à l'éditeur du disjoncteur source après création.
      fromDisjoncteur: { rangeeId: string; disjoncteurId: string }
    }

function nextPosition(rangee: Rangee): number {
  if (rangee.disjoncteurs.length === 0) return 1
  return Math.max(...rangee.disjoncteurs.map((d) => d.position)) + 1
}

function nextNumero(rangees: Rangee[]): number {
  if (rangees.length === 0) return 1
  return Math.max(...rangees.map((r) => r.numero)) + 1
}

function emptyDisjoncteur(tableauId: string, rangeeId: string, position: number): Disjoncteur {
  return {
    id: `${tableauId.toUpperCase()}-${rangeeId.toUpperCase()}-NOUVEAU-${position}`,
    position,
    etiquette: '',
    type_protection: 'disjoncteur',
    calibre: 'C16',
    poles: 'mono',
    phase_affectation: 'inconnue',
    statut: 'actif',
  }
}

function emptyRangee(tableauId: string, numero: number): Rangee {
  return {
    id: `${tableauId}-r${numero}`,
    numero,
    libelle: `R${numero}`,
    phase: 'inconnue',
    disjoncteurs: [],
  }
}

export function TableauDetail({
  tableauId,
  focusDisjoncteurId,
  state,
  onBack,
  onOpenLigne,
}: {
  tableauId: string
  focusDisjoncteurId?: string
  state: Store
  onBack: () => void
  onOpenLigne?: (ligneId: string) => void
}) {
  const tableau = state.tableaux.find((t) => t.id === tableauId)
  const confirmDialog = useConfirm()
  const [panel, setPanel] = useState<PanelState>({ kind: 'none' })
  const [photoZoom, setPhotoZoom] = useState(false)
  const [photoError, setPhotoError] = useState(false)

  // Sensors : un clic court ouvre l'éditeur, un drag de 8px (souris) ou un
  // long press de 200 ms (touch iPad) déclenche le drag & drop.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!tableau) return
    const { active, over } = event
    if (!over) return

    const activeRangeeId = active.data.current?.rangeeId as string | undefined
    if (!activeRangeeId) return

    // La cible peut être un autre disjoncteur (data.rangeeId)
    // ou la zone droppable d'une rangée (id "rangee:<id>")
    let targetRangeeId: string | undefined
    let targetIndex: number | undefined

    const overData = over.data.current as
      | { rangeeId?: string; type?: string }
      | undefined

    if (overData?.type === 'rangee' && overData.rangeeId) {
      // Drop sur le conteneur d'une rangée (fin de liste)
      targetRangeeId = overData.rangeeId
      const r = tableau.rangees.find((x) => x.id === targetRangeeId)
      targetIndex = r ? r.disjoncteurs.length : 0
    } else if (overData?.type === 'disjoncteur' && overData.rangeeId) {
      targetRangeeId = overData.rangeeId
      const r = tableau.rangees.find((x) => x.id === targetRangeeId)
      if (r) {
        const sorted = [...r.disjoncteurs].sort(
          (a, b) => a.position - b.position,
        )
        const overIdx = sorted.findIndex((d) => d.id === over.id)
        targetIndex = overIdx === -1 ? sorted.length : overIdx
      }
    }

    if (!targetRangeeId || targetIndex === undefined) return
    if (active.id === over.id && activeRangeeId === targetRangeeId) return

    try {
      await state.moveDisjoncteur(
        tableau.id,
        active.id as string,
        targetRangeeId,
        targetIndex,
      )
    } catch (e) {
      console.error('[MyElec] Erreur de déplacement :', e)
    }
  }

  // Ouvre l'éditeur sur le disjoncteur ciblé à l'arrivée sur la vue. On ne
  // dépend QUE de [tableauId, focusDisjoncteurId] : dépendre de l'objet
  // `tableau` (recalculé via find() à chaque rendu) rouvrirait le panneau à
  // chaque édition du store, écrasant la navigation de l'utilisateur.
  useEffect(() => {
    const current = state.tableaux.find((t) => t.id === tableauId)
    if (!focusDisjoncteurId || !current) return
    for (const r of current.rangees) {
      if (r.disjoncteurs.some((d) => d.id === focusDisjoncteurId)) {
        setPanel({
          kind: 'editDisjoncteur',
          rangeeId: r.id,
          disjoncteurId: focusDisjoncteurId,
        })
        break
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDisjoncteurId, tableauId])

  const parentTableau = useMemo(
    () =>
      tableau?.parent_tableau_id
        ? state.tableaux.find((t) => t.id === tableau.parent_tableau_id)
        : undefined,
    [state.tableaux, tableau],
  )

  // Map disjoncteur_id → id de la ligne électrique déclarée (la première si
  // plusieurs), pour l'afficher dans la carte de synthèse du disjoncteur.
  // ⚠️ Doit rester AVANT tout `return` conditionnel (règles des hooks).
  const ligneIdByDisjoncteur = useMemo(() => {
    const map = new Map<string, string>()
    for (const l of state.lignes) {
      if (!map.has(l.disjoncteur_id)) map.set(l.disjoncteur_id, l.id)
    }
    return map
  }, [state.lignes])

  if (!tableau) {
    return (
      <div>
        <button
          onClick={onBack}
          className="text-sm text-slate-500 dark:text-slate-400 hover:underline"
        >
          ← Retour
        </button>
        <div className="mt-4">Tableau introuvable.</div>
      </div>
    )
  }

  const phaseStyle = PHASE_STYLES[tableau.arrivee_phases ?? 'inconnue']
  const sortedRangees = [...tableau.rangees].sort((a, b) => a.numero - b.numero)

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <button
          onClick={onBack}
          className="text-sm text-slate-500 dark:text-slate-400 hover:underline"
        >
          ← Tableaux
        </button>
        <button
          onClick={() => setPanel({ kind: 'editTableau' })}
          className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5"
        >
          Éditer le tableau
        </button>
      </div>

      <header className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {tableau.photo_url && !photoError && (
            <button
              onClick={() => setPhotoZoom(true)}
              className="shrink-0 rounded border border-slate-200 dark:border-slate-700 bg-white p-1 hover:shadow"
              aria-label="Agrandir la photo du coffret"
              title="Agrandir"
            >
              <img
                src={tableau.photo_url}
                alt={`Coffret ${tableau.nom}`}
                className="h-20 w-20 object-contain"
                onError={() => setPhotoError(true)}
              />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold">{tableau.nom}</h1>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {tableau.emplacement}
              {parentTableau && (
                <>
                  {' '}
                  · alimenté depuis{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {parentTableau.nom}
                  </span>
                  {tableau.parent_disjoncteur_id && (
                    <>
                      {' '}
                      ·{' '}
                      <code className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">
                        {tableau.parent_disjoncteur_id}
                      </code>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          <span
            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 ring-inset ${phaseStyle.ring} ${phaseStyle.bg} ${phaseStyle.text}`}
          >
            <span className={`h-2 w-2 rounded-full ${phaseStyle.dot}`} />
            {tableau.alimentation === 'triphase' ? 'Triphasé' : 'Monophasé'}
            {tableau.alimentation === 'monophase' && tableau.arrivee_phases
              ? ` · ${tableau.arrivee_phases}`
              : ''}
          </span>
        </div>
        {tableau.notes && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            {tableau.notes}
          </p>
        )}
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          {sortedRangees.map((r) => (
            <RangeeView
              key={r.id}
              rangee={r}
              ligneIdByDisjoncteur={ligneIdByDisjoncteur}
              selectedDisjoncteurId={
                panel.kind === 'editDisjoncteur' && panel.rangeeId === r.id
                  ? panel.disjoncteurId
                  : undefined
              }
              onSelectDisjoncteur={(disjoncteurId) =>
                setPanel({
                  kind: 'editDisjoncteur',
                  rangeeId: r.id,
                  disjoncteurId,
                })
              }
              onEditRangee={() => setPanel({ kind: 'editRangee', rangeeId: r.id })}
              onDeleteRangee={async () => {
                if (
                  await confirmDialog({
                    title: `Supprimer la rangée ${r.id} ?`,
                    message:
                      r.disjoncteurs.length > 0
                        ? `Cette rangée contient ${r.disjoncteurs.length} disjoncteur(s).`
                        : undefined,
                    confirmLabel: 'Supprimer',
                    danger: true,
                  })
                ) {
                  await state.removeRangee(
                    tableau.id,
                    r.id,
                    `Suppression de la rangée ${r.id} dans ${tableau.nom}.`,
                  )
                }
              }}
              onAddDisjoncteur={() =>
                setPanel({ kind: 'createDisjoncteur', rangeeId: r.id })
              }
            />
          ))}

          <button
            onClick={() => setPanel({ kind: 'createRangee' })}
            className="w-full rounded-md border border-dashed border-slate-300 dark:border-slate-700 px-4 py-3 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            + Ajouter une rangée
          </button>
        </div>
      </DndContext>

      <SidePanel
        open={panel.kind !== 'none'}
        onClose={() => setPanel({ kind: 'none' })}
      >
        {renderPanel(
          panel,
          tableau,
          state,
          () => setPanel({ kind: 'none' }),
          onOpenLigne,
          setPanel,
          onBack,
        )}
      </SidePanel>

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

function renderPanel(
  panel: PanelState,
  tableau: Tableau,
  state: Store,
  close: () => void,
  onOpenLigne: ((ligneId: string) => void) | undefined,
  setPanel: (panel: PanelState) => void,
  onBack: () => void,
) {
  if (panel.kind === 'editDisjoncteur') {
    const rangee = tableau.rangees.find((r) => r.id === panel.rangeeId)
    const disjoncteur = rangee?.disjoncteurs.find(
      (d) => d.id === panel.disjoncteurId,
    )
    if (!rangee || !disjoncteur) return <div>Disjoncteur introuvable.</div>
    return (
      <DisjoncteurEditor
        key={disjoncteur.id}
        mode="edit"
        tableau={tableau}
        rangeeId={rangee.id}
        initial={disjoncteur}
        lignes={state.lignes}
        endpoints={state.endpoints}
        appareils={state.appareils}
        pieces={state.pieces}
        onOpenLigne={onOpenLigne}
        onCreateLigne={() =>
          setPanel({
            kind: 'createLigne',
            initial: {
              id: ligneIdFromDisjoncteur(disjoncteur.id, state.lignes),
              libelle: disjoncteur.etiquette,
              disjoncteur_id: disjoncteur.id,
            },
            fromDisjoncteur: {
              rangeeId: rangee.id,
              disjoncteurId: disjoncteur.id,
            },
          })
        }
        onSave={async (next, desc) => {
          await state.editDisjoncteur(
            tableau.id,
            rangee.id,
            disjoncteur.id,
            next,
            desc,
          )
          close()
        }}
        onDelete={async () => {
          await state.removeDisjoncteur(
            tableau.id,
            rangee.id,
            disjoncteur.id,
            `Suppression du disjoncteur ${disjoncteur.id} (${disjoncteur.etiquette}).`,
          )
          close()
        }}
        onCancel={close}
      />
    )
  }

  if (panel.kind === 'createDisjoncteur') {
    const rangee = tableau.rangees.find((r) => r.id === panel.rangeeId)
    if (!rangee) return <div>Rangée introuvable.</div>
    return (
      <DisjoncteurEditor
        mode="create"
        tableau={tableau}
        rangeeId={rangee.id}
        initial={emptyDisjoncteur(tableau.id, rangee.id, nextPosition(rangee))}
        onSave={async (next, desc) => {
          await state.upsertDisjoncteur(tableau.id, rangee.id, next, desc)
          close()
        }}
        onCancel={close}
      />
    )
  }

  if (panel.kind === 'editRangee') {
    const rangee = tableau.rangees.find((r) => r.id === panel.rangeeId)
    if (!rangee) return <div>Rangée introuvable.</div>
    return (
      <RangeeEditor
        mode="edit"
        tableau={tableau}
        initial={rangee}
        onSave={async (next, desc) => {
          await state.upsertRangee(tableau.id, next, desc)
          close()
        }}
        onDelete={async () => {
          await state.removeRangee(
            tableau.id,
            rangee.id,
            `Suppression de la rangée ${rangee.id} dans ${tableau.nom}.`,
          )
          close()
        }}
        onCancel={close}
      />
    )
  }

  if (panel.kind === 'createRangee') {
    return (
      <RangeeEditor
        mode="create"
        tableau={tableau}
        initial={emptyRangee(tableau.id, nextNumero(tableau.rangees))}
        onSave={async (next, desc) => {
          await state.upsertRangee(tableau.id, next, desc)
          close()
        }}
        onCancel={close}
      />
    )
  }

  if (panel.kind === 'createLigne') {
    const backToDisjoncteur = () =>
      setPanel({
        kind: 'editDisjoncteur',
        rangeeId: panel.fromDisjoncteur.rangeeId,
        disjoncteurId: panel.fromDisjoncteur.disjoncteurId,
      })
    return (
      <LigneEditor
        mode="create"
        initial={panel.initial}
        tableaux={state.tableaux}
        allLignes={state.lignes}
        onSave={async (next, desc) => {
          await state.ligneOps.upsert(next, desc)
          // Retour à l'éditeur du disjoncteur : la nouvelle ligne y apparaît
          // aussitôt dans la « Cartographie aval ».
          backToDisjoncteur()
        }}
        onCancel={backToDisjoncteur}
      />
    )
  }

  if (panel.kind === 'editTableau') {
    return (
      <TableauEditor
        initial={tableau}
        allTableaux={state.tableaux}
        onSave={async (next, desc) => {
          await state.upsertTableau(next, desc)
          close()
        }}
        onDelete={async () => {
          await state.removeTableau(
            tableau.id,
            `Suppression du tableau ${tableau.nom}.`,
          )
          close()
          // Le tableau courant n'existe plus : on quitte sa vue (sinon on
          // resterait bloqué sur « Tableau introuvable »).
          onBack()
        }}
        onCancel={close}
      />
    )
  }

  return null
}

import { useEffect, useMemo, useState } from 'react'
import type {
  Disjoncteur,
  Rangee,
  Tableau,
} from '../types/electrical'
import type { MyElecState } from '../hooks/useTableaux'
import { PHASE_STYLES } from '../utils/phaseStyle'
import { DisjoncteurEditor } from './DisjoncteurEditor'
import { RangeeEditor } from './RangeeEditor'
import { RangeeView } from './RangeeView'
import { SidePanel } from './SidePanel'
import { TableauEditor } from './TableauEditor'

type PanelState =
  | { kind: 'none' }
  | { kind: 'editDisjoncteur'; rangeeId: string; disjoncteurId: string }
  | { kind: 'createDisjoncteur'; rangeeId: string }
  | { kind: 'editRangee'; rangeeId: string }
  | { kind: 'createRangee' }
  | { kind: 'editTableau' }

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
}: {
  tableauId: string
  focusDisjoncteurId?: string
  state: MyElecState
  onBack: () => void
}) {
  const tableau = state.tableaux.find((t) => t.id === tableauId)
  const [panel, setPanel] = useState<PanelState>({ kind: 'none' })

  useEffect(() => {
    if (!focusDisjoncteurId || !tableau) return
    for (const r of tableau.rangees) {
      if (r.disjoncteurs.some((d) => d.id === focusDisjoncteurId)) {
        setPanel({
          kind: 'editDisjoncteur',
          rangeeId: r.id,
          disjoncteurId: focusDisjoncteurId,
        })
        break
      }
    }
  }, [focusDisjoncteurId, tableau])

  const parentTableau = useMemo(
    () =>
      tableau?.parent_tableau_id
        ? state.tableaux.find((t) => t.id === tableau.parent_tableau_id)
        : undefined,
    [state.tableaux, tableau],
  )

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
          <div>
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

      <div className="space-y-4">
        {sortedRangees.map((r) => (
          <RangeeView
            key={r.id}
            rangee={r}
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
                confirm(
                  r.disjoncteurs.length > 0
                    ? `Cette rangée contient ${r.disjoncteurs.length} disjoncteur(s). Supprimer quand même ?`
                    : `Supprimer la rangée ${r.id} ?`,
                )
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

      <SidePanel
        open={panel.kind !== 'none'}
        onClose={() => setPanel({ kind: 'none' })}
      >
        {renderPanel(panel, tableau, state, () => setPanel({ kind: 'none' }))}
      </SidePanel>
    </div>
  )
}

function renderPanel(
  panel: PanelState,
  tableau: Tableau,
  state: MyElecState,
  close: () => void,
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
        onSave={async (next, desc) => {
          await state.upsertDisjoncteur(tableau.id, rangee.id, next, desc)
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
        }}
        onCancel={close}
      />
    )
  }

  return null
}

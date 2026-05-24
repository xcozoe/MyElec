import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import type { Rangee } from '../types/electrical'
import { PHASE_STYLES } from '../utils/phaseStyle'
import { DisjoncteurCard } from './DisjoncteurCard'

export function RangeeView({
  rangee,
  selectedDisjoncteurId,
  onSelectDisjoncteur,
  onEditRangee,
  onDeleteRangee,
  onAddDisjoncteur,
}: {
  rangee: Rangee
  selectedDisjoncteurId?: string
  onSelectDisjoncteur: (disjoncteurId: string) => void
  onEditRangee: () => void
  onDeleteRangee: () => void
  onAddDisjoncteur: () => void
}) {
  const phaseStyle = PHASE_STYLES[rangee.phase]
  const sortedDisjoncteurs = [...rangee.disjoncteurs].sort(
    (a, b) => a.position - b.position,
  )

  // Zone droppable pour la rangée entière (utile quand elle est vide ou
  // pour déposer en fin de liste).
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `rangee:${rangee.id}`,
    data: { rangeeId: rangee.id, type: 'rangee' },
  })

  return (
    <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <header className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-800">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${phaseStyle.ring} ${phaseStyle.bg} ${phaseStyle.text}`}
        >
          <span className={`h-2 w-2 rounded-full ${phaseStyle.dot}`} />
          R{rangee.numero} · {phaseStyle.label}
        </span>
        <h3 className="font-medium text-sm sm:text-base">{rangee.libelle}</h3>
        <div className="ml-auto flex gap-1">
          <button
            onClick={onAddDisjoncteur}
            className="text-xs rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            + Disjoncteur
          </button>
          <button
            onClick={onEditRangee}
            className="text-xs rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Éditer
          </button>
          <button
            onClick={onDeleteRangee}
            className="text-xs rounded-md border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            Supprimer
          </button>
        </div>
      </header>
      {rangee.notes && (
        <div className="px-4 pt-2 text-xs text-slate-500 dark:text-slate-400">
          {rangee.notes}
        </div>
      )}
      <SortableContext
        items={sortedDisjoncteurs.map((d) => d.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div
          ref={setDroppableRef}
          className={[
            'p-3 flex flex-wrap gap-2 min-h-[88px] transition-colors',
            isOver ? 'bg-slate-100 dark:bg-slate-800/40 ring-2 ring-inset ring-slate-400 dark:ring-slate-600 rounded-md' : '',
          ].join(' ')}
        >
          {sortedDisjoncteurs.length === 0 && (
            <div className="text-xs text-slate-400 italic px-1 self-center">
              Glissez un disjoncteur ici, ou cliquez sur « + Disjoncteur ».
            </div>
          )}
          {sortedDisjoncteurs.map((d) => (
            <DisjoncteurCard
              key={d.id}
              disjoncteur={d}
              rangeeId={rangee.id}
              rangeePhase={rangee.phase}
              isDifferentielTete={rangee.differentiel_id === d.id}
              selected={selectedDisjoncteurId === d.id}
              onClick={() => onSelectDisjoncteur(d.id)}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  )
}

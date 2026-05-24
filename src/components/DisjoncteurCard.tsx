import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Disjoncteur, Phase } from '../types/electrical'
import { PHASE_STYLES } from '../utils/phaseStyle'

export function DisjoncteurCard({
  disjoncteur,
  rangeeId,
  rangeePhase,
  isDifferentielTete,
  selected,
  onClick,
  draggable = true,
}: {
  disjoncteur: Disjoncteur
  rangeeId: string
  rangeePhase: Phase
  isDifferentielTete: boolean
  selected: boolean
  onClick: () => void
  draggable?: boolean
}) {
  const phase = disjoncteur.phase_affectation
  const style = PHASE_STYLES[phase]
  const isLibre = disjoncteur.statut === 'libre'
  const isDesaffecte = disjoncteur.statut === 'desaffecte'
  const aIdentifier = phase === 'inconnue' || isLibre

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: disjoncteur.id,
    data: { rangeeId, type: 'disjoncteur' },
    disabled: !draggable,
  })

  const dndStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'none',
  }

  return (
    <button
      ref={setNodeRef}
      style={dndStyle}
      {...attributes}
      {...listeners}
      onClick={onClick}
      title={`${disjoncteur.id} — ${disjoncteur.etiquette}`}
      className={[
        'group relative flex flex-col rounded-md text-left transition',
        'ring-1 ring-inset',
        style.ring,
        style.bg,
        style.text,
        isDifferentielTete
          ? 'min-w-[140px] py-2.5 px-3 ring-2 shadow-sm'
          : 'min-w-[110px] py-2 px-2.5',
        selected ? 'outline outline-2 outline-offset-2 outline-slate-900 dark:outline-white' : '',
        isLibre ? 'opacity-70' : '',
        isDesaffecte ? 'line-through opacity-50' : '',
        isDragging ? 'cursor-grabbing shadow-lg z-10' : 'cursor-grab hover:shadow',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase font-bold tracking-wider">
          {style.label}
        </span>
        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
          {disjoncteur.calibre}
        </span>
      </div>
      <div className="mt-0.5 text-sm font-medium leading-tight line-clamp-2">
        {disjoncteur.etiquette || '—'}
      </div>
      <div className="mt-0.5 text-[10px] font-mono opacity-70">
        {disjoncteur.id}
      </div>
      {(aIdentifier || isDifferentielTete) && (
        <div className="mt-1 flex flex-wrap gap-1">
          {isDifferentielTete && (
            <span className="text-[9px] uppercase rounded bg-white/70 dark:bg-slate-950/40 px-1 py-0.5">
              Diff
            </span>
          )}
          {isLibre && (
            <span className="text-[9px] uppercase rounded bg-white/70 dark:bg-slate-950/40 px-1 py-0.5">
              libre
            </span>
          )}
          {phase === 'inconnue' && rangeePhase !== 'inconnue' && (
            <span className="text-[9px] uppercase rounded bg-white/70 dark:bg-slate-950/40 px-1 py-0.5">
              phase ?
            </span>
          )}
        </div>
      )}
    </button>
  )
}

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

  // Le `touch-action: none` est UNIQUEMENT sur le handle pour ne pas
  // bloquer le scroll vertical de l'app sur iPhone/iPad. Le reste de la
  // carte reste scrollable/cliquable normalement.
  const dndStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={dndStyle}
      className={[
        'group relative rounded-md',
        isDifferentielTete ? 'min-w-[140px]' : 'min-w-[110px]',
        isDragging ? 'shadow-lg z-10' : '',
      ].join(' ')}
    >
      <button
        onClick={onClick}
        title={`${disjoncteur.id} — ${disjoncteur.etiquette}`}
        className={[
          'w-full flex flex-col rounded-md text-left transition',
          'ring-1 ring-inset',
          style.ring,
          style.bg,
          style.text,
          isDifferentielTete
            ? 'py-2.5 pl-3 pr-7 ring-2 shadow-sm'
            : 'py-2 pl-2.5 pr-7',
          selected ? 'outline outline-2 outline-offset-2 outline-slate-900 dark:outline-white' : '',
          isLibre ? 'opacity-70' : '',
          isDesaffecte ? 'line-through opacity-50' : '',
          'hover:shadow',
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
      {draggable && (
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label="Glisser pour déplacer ce disjoncteur"
          title="Glisser pour déplacer"
          style={{ touchAction: 'none' }}
          className={[
            'absolute top-0 right-0 h-full w-6 flex items-center justify-center',
            'rounded-r-md border-l border-current/10',
            'opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5',
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
            'select-none',
          ].join(' ')}
        >
          <DragHandleIcon />
        </div>
      )}
    </div>
  )
}

function DragHandleIcon() {
  return (
    <svg
      width="10"
      height="16"
      viewBox="0 0 10 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="2.5" cy="3" r="1.2" />
      <circle cx="7.5" cy="3" r="1.2" />
      <circle cx="2.5" cy="8" r="1.2" />
      <circle cx="7.5" cy="8" r="1.2" />
      <circle cx="2.5" cy="13" r="1.2" />
      <circle cx="7.5" cy="13" r="1.2" />
    </svg>
  )
}

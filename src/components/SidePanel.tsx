import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useConfirm } from './Dialogs'

const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

interface SidePanelGuard {
  /** L'éditeur signale s'il a des modifications non enregistrées. */
  setDirty: (dirty: boolean) => void
  /** Demande la fermeture : confirme d'abord si des modifs sont en cours. */
  requestClose: () => void
}

const SidePanelGuardContext = createContext<SidePanelGuard | null>(null)

/**
 * À utiliser dans un éditeur rendu à l'intérieur d'un <SidePanel> pour :
 *  - déclarer son état "dirty" (modifications non enregistrées) ;
 *  - déclencher une fermeture protégée par confirmation.
 * Renvoie `null` si l'éditeur n'est pas dans un SidePanel.
 */
export function useSidePanelGuard() {
  return useContext(SidePanelGuardContext)
}

export function SidePanel({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const [dirty, setDirty] = useState(false)
  const confirm = useConfirm()
  const asideRef = useRef<HTMLElement>(null)

  // Glisser-vers-le-bas pour fermer (mobile).
  const [dragY, setDragY] = useState(0)
  // dragStartRef != null ⇒ un glissement est en cours. Lu au rendu pour couper
  // la transition pendant le drag (le panneau colle au doigt) et la rétablir au
  // relâchement (retour en place ou fermeture animés).
  const dragStartRef = useRef<number | null>(null)
  // Miroir de dragY lu à la fin du geste (indépendant du timing de rendu React).
  const dragYRef = useRef(0)

  const requestClose = useCallback(async () => {
    if (dirty) {
      const ok = await confirm({
        title: 'Abandonner les modifications ?',
        message: 'Des changements non enregistrés seront perdus.',
        confirmLabel: 'Abandonner',
        danger: true,
      })
      if (!ok) return
    }
    onClose()
  }, [dirty, confirm, onClose])

  // Remet l'état "dirty" à zéro quand le panneau se ferme (prochaine ouverture
  // propre, y compris après une sauvegarde qui ferme le panneau directement).
  useEffect(() => {
    if (!open) setDirty(false)
    setDragY(0)
  }, [open])

  // Verrouille le scroll de l'arrière-plan tant que la sheet est ouverte :
  // sans ça, le geste de défilement fait bouger la page derrière, pas la sheet.
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  // Focus le premier élément focusable à l'ouverture (accessibilité clavier).
  useEffect(() => {
    if (!open) return
    asideRef.current
      ?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      ?.focus()
  }, [open])

  // Échap pour fermer + piège à focus (Tab/Shift+Tab cyclent dans le panneau,
  // et tout focus échappé est ramené dedans).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        void requestClose()
        return
      }
      if (e.key !== 'Tab') return
      const root = asideRef.current
      if (!root) return
      const items = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((n) => n.offsetParent !== null)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (active instanceof Node && !root.contains(active)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, requestClose])

  const guardValue = useMemo<SidePanelGuard>(
    () => ({ setDirty, requestClose }),
    [requestClose],
  )

  // Le glissement ne démarre que depuis la poignée, ou quand la sheet est déjà
  // en haut de son scroll (sinon on laisse le contenu défiler normalement).
  const onTouchStart = (e: React.TouchEvent) => {
    const fromGrip = (e.target as HTMLElement).closest('[data-grip]') != null
    const atTop = (asideRef.current?.scrollTop ?? 0) <= 0
    dragStartRef.current = fromGrip || atTop ? e.touches[0].clientY : null
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStartRef.current == null) return
    const dy = Math.max(0, e.touches[0].clientY - dragStartRef.current)
    dragYRef.current = dy
    setDragY(dy)
  }
  const onTouchEnd = () => {
    if (dragStartRef.current == null) return
    // On coupe le drag AVANT setDragY pour que le rendu rétablisse la transition
    // (retour en place ou glissement de fermeture animés).
    dragStartRef.current = null
    const dy = dragYRef.current
    dragYRef.current = 0
    const height = asideRef.current?.offsetHeight ?? window.innerHeight
    // Seuil : un tiers de la hauteur de la sheet (borné), comportement classique.
    const threshold = Math.min(140, height * 0.33)
    if (dy > threshold) {
      if (dirty) {
        // Modifs non enregistrées : on revient en place et on confirme d'abord.
        setDragY(0)
        void requestClose()
      } else {
        // Au-delà du seuil : la sheet finit de glisser vers le bas toute seule,
        // puis se ferme (la transition est active car dragging repasse à false).
        setDragY(height + 40)
        window.setTimeout(onClose, 240)
      }
    } else {
      // En deçà : retour à la position par défaut.
      setDragY(0)
    }
  }

  if (!open) return null
  return (
    <SidePanelGuardContext.Provider value={guardValue}>
      {/* Bottom sheet : voile + panneau qui remonte du bas, pleine largeur. */}
      <div className="fixed inset-0 z-40 flex items-end justify-center">
        <div
          className="absolute inset-0 bg-slate-950/45 animate-sheet-backdrop"
          onClick={() => void requestClose()}
          aria-hidden
        />
        <aside
          ref={asideRef}
          role="dialog"
          aria-modal="true"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            transform: dragY ? `translateY(${dragY}px)` : undefined,
            transition:
              dragStartRef.current != null ? 'none' : 'transform 0.25s ease',
          }}
          className="relative w-full max-h-[92dvh] overflow-y-auto overscroll-contain bg-white dark:bg-slate-950 rounded-t-2xl border-t border-slate-200 dark:border-slate-800 shadow-2xl px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] animate-sheet-up"
        >
          {/* Poignée de préhension — affordance « bottom sheet ». Glisser vers
              le bas (ou cliquer) pour fermer ; hors du piège à focus
              (tabindex=-1) pour que l'ouverture focalise le 1er champ. */}
          <button
            type="button"
            data-grip
            tabIndex={-1}
            aria-hidden
            onClick={() => void requestClose()}
            className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 touch-none"
          />
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </aside>
      </div>
    </SidePanelGuardContext.Provider>
  )
}

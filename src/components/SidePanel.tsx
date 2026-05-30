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

  // Miroir de `dirty` lisible dans les écouteurs natifs du glissement (sans
  // réattacher les écouteurs à chaque frappe).
  const dirtyRef = useRef(false)
  dirtyRef.current = dirty
  // Vrai si le dernier geste tactile était un glissement (≠ tap) : sert à ne
  // pas déclencher le clic « fermer » de la poignée après un drag annulé.
  const movedRef = useRef(false)

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

  // Glisser-vers-le-bas pour fermer (mobile). Écouteurs natifs car le touchmove
  // doit être NON passif pour pouvoir preventDefault() et empêcher le scroll
  // natif de la page de concurrencer le geste. On manipule directement le
  // transform (fluide, sans re-render par frame).
  useEffect(() => {
    if (!open) return
    const el = asideRef.current
    if (!el) return

    let active = false
    let startY = 0
    let dy = 0

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const fromGrip =
        (e.target as HTMLElement)?.closest?.('[data-grip]') != null
      // On ne capture que depuis la poignée, ou quand le contenu est déjà en
      // haut de son scroll (sinon on laisse le contenu défiler normalement).
      if (!fromGrip && el.scrollTop > 0) {
        active = false
        return
      }
      active = true
      movedRef.current = false
      startY = e.touches[0].clientY
      dy = 0
      el.style.transition = 'none'
    }

    const onMove = (e: TouchEvent) => {
      if (!active) return
      const delta = e.touches[0].clientY - startY
      if (delta <= 0) {
        // Remontée : on rend la main au contenu (scroll natif).
        if (dy !== 0) el.style.transform = ''
        dy = 0
        active = false
        el.style.transition = ''
        return
      }
      if (delta > 6) movedRef.current = true
      if (e.cancelable) e.preventDefault()
      dy = delta
      el.style.transform = `translateY(${delta}px)`
    }

    const onEnd = () => {
      if (!active) return
      active = false
      const height = el.offsetHeight || window.innerHeight
      // Seuil purement basé sur la distance : sous le seuil on remonte, au-delà
      // on ferme (comportement prévisible, indépendant de la vitesse).
      const shouldClose = dy > Math.min(150, height * 0.25)
      el.style.transition = 'transform 0.25s ease'
      if (!shouldClose) {
        el.style.transform = ''
        return
      }
      if (dirtyRef.current) {
        // Modifs non enregistrées : retour en place + confirmation.
        el.style.transform = ''
        void requestClose()
        return
      }
      // Au-delà du seuil : finit de glisser vers le bas tout seul, puis ferme.
      el.style.transform = `translateY(${height + 40}px)`
      window.setTimeout(() => onClose(), 220)
    }

    const onCancel = () => {
      if (!active) return
      active = false
      el.style.transition = 'transform 0.25s ease'
      el.style.transform = ''
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onCancel)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onCancel)
    }
  }, [open, onClose, requestClose])

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
          className="relative w-full max-h-[92dvh] overflow-y-auto overscroll-contain bg-white dark:bg-slate-950 rounded-t-2xl border-t border-slate-200 dark:border-slate-800 shadow-2xl px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] animate-sheet-up"
        >
          {/* Poignée de préhension — affordance « bottom sheet ». Glisser vers
              le bas (ou cliquer) pour fermer ; hors du piège à focus
              (tabindex=-1) pour que l'ouverture focalise le 1er champ. Le clic
              est ignoré juste après un glissement (movedRef). */}
          <button
            type="button"
            data-grip
            tabIndex={-1}
            aria-hidden
            onClick={() => {
              if (movedRef.current) return
              void requestClose()
            }}
            className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
          />
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </aside>
      </div>
    </SidePanelGuardContext.Provider>
  )
}

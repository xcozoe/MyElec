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
          {/* Poignée de préhension — affordance « bottom sheet ». Cliquable
              à la souris pour fermer, mais hors du piège à focus (tabindex=-1)
              pour que l'ouverture focalise le 1er champ, pas la poignée. */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => void requestClose()}
            className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
          />
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </aside>
      </div>
    </SidePanelGuardContext.Provider>
  )
}

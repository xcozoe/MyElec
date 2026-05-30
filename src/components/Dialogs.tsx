import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Style « action destructive » (bouton rouge) pour les suppressions. */
  danger?: boolean
}

type ToastType = 'info' | 'error'
interface Toast {
  id: number
  message: string
  type: ToastType
}

interface DialogContextValue {
  /** Affiche une confirmation modale. Résout `true` si l'utilisateur valide. */
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  /** Affiche une notification transitoire (remplace `alert`). */
  notify: (message: string, type?: ToastType) => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

interface ConfirmState {
  opts: ConfirmOptions
  resolve: (result: boolean) => void
}

/**
 * Fournit des dialogues applicatifs (confirm/notify) en remplacement des
 * `window.confirm` / `window.alert` natifs : non bloquants, stylés, et
 * cohérents avec le thème (clair/sombre).
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setConfirmState({ opts, resolve })),
    [],
  )

  const settle = useCallback(
    (result: boolean) => {
      setConfirmState((curr) => {
        curr?.resolve(result)
        return null
      })
    },
    [],
  )

  const notify = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId.current
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 4500)
  }, [])

  return (
    <DialogContext.Provider value={{ confirm, notify }}>
      {children}
      {confirmState &&
        createPortal(
          <ConfirmModal
            opts={confirmState.opts}
            onCancel={() => settle(false)}
            onConfirm={() => settle(true)}
          />,
          document.body,
        )}
      {toasts.length > 0 &&
        createPortal(
          <div className="fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pointer-events-none">
            {toasts.map((t) => (
              <div
                key={t.id}
                role="status"
                className={`pointer-events-auto max-w-md w-full rounded-md px-4 py-2.5 text-sm shadow-lg border ${
                  t.type === 'error'
                    ? 'bg-red-600 text-white border-red-700'
                    : 'bg-slate-900 text-white border-slate-700 dark:bg-white dark:text-slate-900 dark:border-slate-200'
                }`}
              >
                {t.message}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </DialogContext.Provider>
  )
}

function ConfirmModal({
  opts,
  onCancel,
  onConfirm,
}: {
  opts: ConfirmOptions
  onCancel: () => void
  onConfirm: () => void
}) {
  const confirmRef = useRef<HTMLButtonElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
        return
      }
      // Piège à focus : Tab/Shift+Tab restent sur les boutons de la modale.
      if (e.key !== 'Tab') return
      const root = dialogRef.current
      if (!root) return
      const items = Array.from(
        root.querySelectorAll<HTMLButtonElement>('button'),
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
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={opts.title}
    >
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden
      />
      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-2xl p-5"
      >
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {opts.title}
        </h2>
        {opts.message && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">
            {opts.message}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border border-slate-300 dark:border-slate-700 px-4 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {opts.cancelLabel ?? 'Annuler'}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              opts.danger
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90'
            }`}
          >
            {opts.confirmLabel ?? 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function useDialogs(): DialogContextValue {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialogs must be used inside <DialogProvider>')
  return ctx
}

export function useConfirm() {
  return useDialogs().confirm
}

export function useNotify() {
  return useDialogs().notify
}

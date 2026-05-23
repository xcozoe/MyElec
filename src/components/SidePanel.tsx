import { useEffect } from 'react'

export function SidePanel({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex">
      <div
        className="flex-1 bg-slate-950/40"
        onClick={onClose}
        aria-hidden
      />
      <aside className="w-full sm:w-[480px] h-full overflow-y-auto bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 p-5 shadow-xl">
        {children}
      </aside>
    </div>
  )
}

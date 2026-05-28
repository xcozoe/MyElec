import type { ReactNode } from 'react'

/**
 * Champ de formulaire standard (label + zone de saisie + indice optionnel).
 * Extrait ici pour être partagé par tous les éditeurs (auparavant dupliqué
 * à l'identique dans chaque fichier d'éditeur).
 */
export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint && (
        <span className="block mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      )}
    </label>
  )
}

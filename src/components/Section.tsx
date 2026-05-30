import type { ReactNode } from 'react'

/**
 * Carte de section pour les éditeurs : bordure + fond légèrement teinté +
 * ombre douce, avec un titre lisible. Sert à regrouper visuellement les champs
 * d'un volet d'édition (Identification / Définition / …).
 */
export function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4 sm:p-5 shadow-sm space-y-4">
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {title}
      </h4>
      {children}
    </section>
  )
}

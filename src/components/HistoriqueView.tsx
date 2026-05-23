import { useMemo, useState } from 'react'
import type { EntiteType, Modification, Tableau } from '../types/electrical'

function findContext(
  tableaux: Tableau[],
  entite: EntiteType,
  entiteId: string,
):
  | { tableauId: string; rangeeId?: string; disjoncteurId?: string }
  | undefined {
  if (entite === 'tableau') {
    const t = tableaux.find((x) => x.id === entiteId)
    return t ? { tableauId: t.id } : undefined
  }
  if (entite === 'rangee') {
    for (const t of tableaux) {
      if (t.rangees.some((r) => r.id === entiteId)) {
        return { tableauId: t.id, rangeeId: entiteId }
      }
    }
  }
  if (entite === 'disjoncteur') {
    for (const t of tableaux) {
      for (const r of t.rangees) {
        if (r.disjoncteurs.some((d) => d.id === entiteId)) {
          return {
            tableauId: t.id,
            rangeeId: r.id,
            disjoncteurId: entiteId,
          }
        }
      }
    }
  }
  return undefined
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function HistoriqueView({
  modifications,
  tableaux,
  onOpenEntite,
}: {
  modifications: Modification[]
  tableaux: Tableau[]
  onOpenEntite: (tableauId: string, disjoncteurId?: string) => void
}) {
  const [filterEntite, setFilterEntite] = useState<'all' | EntiteType>('all')
  const [filterTableau, setFilterTableau] = useState<string>('all')
  const [filterPeriod, setFilterPeriod] = useState<'all' | '7d' | '30d' | '1y'>('all')

  const filtered = useMemo(() => {
    const now = Date.now()
    const period =
      filterPeriod === '7d'
        ? 7 * 24 * 3600 * 1000
        : filterPeriod === '30d'
          ? 30 * 24 * 3600 * 1000
          : filterPeriod === '1y'
            ? 365 * 24 * 3600 * 1000
            : null
    return [...modifications]
      .filter((m) => {
        if (filterEntite !== 'all' && m.entite !== filterEntite) return false
        if (filterTableau !== 'all') {
          const ctx = findContext(tableaux, m.entite, m.entite_id)
          if (!ctx || ctx.tableauId !== filterTableau) return false
        }
        if (period !== null) {
          const t = Date.parse(m.date)
          if (Number.isFinite(t) && now - t > period) return false
        }
        return true
      })
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  }, [modifications, filterEntite, filterTableau, filterPeriod, tableaux])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Historique</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        {modifications.length} entrée(s) au total — {filtered.length} affichée(s).
      </p>

      <div className="flex flex-wrap gap-3 mb-4 text-sm">
        <select
          value={filterEntite}
          onChange={(e) =>
            setFilterEntite(e.target.value as 'all' | EntiteType)
          }
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
        >
          <option value="all">Toutes entités</option>
          <option value="tableau">Tableaux</option>
          <option value="rangee">Rangées</option>
          <option value="disjoncteur">Disjoncteurs</option>
        </select>

        <select
          value={filterTableau}
          onChange={(e) => setFilterTableau(e.target.value)}
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
        >
          <option value="all">Tous tableaux</option>
          {tableaux.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nom}
            </option>
          ))}
        </select>

        <select
          value={filterPeriod}
          onChange={(e) =>
            setFilterPeriod(e.target.value as 'all' | '7d' | '30d' | '1y')
          }
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
        >
          <option value="all">Toute période</option>
          <option value="7d">7 derniers jours</option>
          <option value="30d">30 derniers jours</option>
          <option value="1y">1 an</option>
        </select>
      </div>

      <ol className="space-y-2">
        {filtered.length === 0 && (
          <li className="text-sm text-slate-500 dark:text-slate-400">
            Aucune entrée pour ces filtres.
          </li>
        )}
        {filtered.map((m) => {
          const ctx = findContext(tableaux, m.entite, m.entite_id)
          return (
            <li
              key={m.id}
              className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <time className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {formatDate(m.date)}
                </time>
                <span
                  className={
                    'text-[10px] uppercase rounded px-1.5 py-0.5 ' +
                    (m.type === 'creation'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : m.type === 'suppression'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300')
                  }
                >
                  {m.type}
                </span>
                <span className="text-[10px] uppercase rounded px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800">
                  {m.entite}
                </span>
                {ctx ? (
                  <button
                    onClick={() => onOpenEntite(ctx.tableauId, ctx.disjoncteurId)}
                    className="text-sm font-mono underline decoration-dotted hover:opacity-80"
                  >
                    {m.entite_id}
                  </button>
                ) : (
                  <code className="text-sm text-slate-500">{m.entite_id}</code>
                )}
                {m.utilisateur && (
                  <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                    par {m.utilisateur}
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm">{m.description}</div>
              {m.champ_modifie && (
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <code className="text-[11px] mr-1">{m.champ_modifie}</code>
                  <span className="line-through">{m.ancienne_valeur ?? '∅'}</span>
                  <span className="mx-1">→</span>
                  <span className="font-medium">{m.nouvelle_valeur ?? '∅'}</span>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

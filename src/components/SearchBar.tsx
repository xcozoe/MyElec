import { useState } from 'react'
import { useSearch, type SearchHit } from '../hooks/useSearch'
import type { Tableau } from '../types/electrical'

export function SearchBar({
  tableaux,
  onSelect,
}: {
  tableaux: Tableau[]
  onSelect: (hit: SearchHit) => void
}) {
  const { query, setQuery, results } = useSearch(tableaux)
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Rechercher (étiquette, ID, note)…"
        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm placeholder:text-slate-400"
      />
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-[60vh] overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
          {results.map((hit, i) => (
            <button
              key={`${hit.type}-${hit.tableauId}-${hit.rangeeId ?? ''}-${hit.disjoncteurId ?? ''}-${i}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(hit)
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
            >
              <div className="text-sm font-medium">{hit.label}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {hit.sublabel} · {hit.type}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

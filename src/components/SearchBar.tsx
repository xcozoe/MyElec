import { useState } from 'react'
import { useSearch, type SearchData, type SearchHit } from '../hooks/useSearch'

const TYPE_BADGES: Record<SearchHit['type'], string> = {
  tableau: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  rangee: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  disjoncteur: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  piece: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  ligne: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  endpoint: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300',
  appareil: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300',
  volet: 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300',
}

export function SearchBar({
  data,
  onSelect,
}: {
  data: SearchData
  onSelect: (hit: SearchHit) => void
}) {
  const { query, setQuery, results } = useSearch(data)
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
        placeholder="Rechercher (tableau, pièce, ligne, end-point, appareil…)"
        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm placeholder:text-slate-400"
      />
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-[60vh] overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
          {results.map((hit, i) => (
            <button
              key={`${hit.type}-${hit.tableauId ?? ''}-${hit.rangeeId ?? ''}-${hit.disjoncteurId ?? ''}-${hit.pieceId ?? ''}-${hit.ligneId ?? ''}-${hit.endpointId ?? ''}-${hit.appareilId ?? ''}-${hit.voletId ?? ''}-${i}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(hit)
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-b-0 flex items-start gap-2"
            >
              <span
                className={`shrink-0 text-[9px] uppercase rounded px-1.5 py-0.5 ${TYPE_BADGES[hit.type]}`}
              >
                {hit.type}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{hit.label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {hit.sublabel}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
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

export function SearchOverlay({
  data,
  onSelect,
  onClose,
}: {
  data: SearchData
  onSelect: (hit: SearchHit) => void
  onClose: () => void
}) {
  const { query, setQuery, results } = useSearch(data)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    // Mémorise l'élément focalisé pour lui rendre le focus à la fermeture.
    const previouslyFocused = document.activeElement as HTMLElement | null
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  // Garde l'option active visible lors de la navigation au clavier.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-idx="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, results])

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = results[activeIndex]
      if (hit) {
        onSelect(hit)
        onClose()
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recherche"
        className="relative w-full max-w-2xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800">
          <SearchIcon className="h-5 w-5 text-slate-400" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0) // remet la sélection en tête à chaque saisie
            }}
            onKeyDown={onInputKeyDown}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
            aria-activedescendant={
              results.length > 0 ? `search-opt-${activeIndex}` : undefined
            }
            placeholder="Rechercher (tableau, pièce, ligne, end-point, appareil…)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline-block text-[10px] text-slate-400 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5">
            Échap
          </kbd>
        </div>

        {query.trim().length > 0 && (
          <div
            ref={listRef}
            id="search-results"
            role="listbox"
            className="max-h-[60vh] overflow-y-auto"
          >
            {results.length === 0 ? (
              <div className="px-3 py-6 text-sm text-slate-500 dark:text-slate-400 text-center">
                Aucun résultat.
              </div>
            ) : (
              results.map((hit, i) => (
                <button
                  key={`${hit.type}-${hit.tableauId ?? ''}-${hit.rangeeId ?? ''}-${hit.disjoncteurId ?? ''}-${hit.pieceId ?? ''}-${hit.ligneId ?? ''}-${hit.endpointId ?? ''}-${hit.appareilId ?? ''}-${hit.voletId ?? ''}-${i}`}
                  id={`search-opt-${i}`}
                  data-idx={i}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => {
                    onSelect(hit)
                    onClose()
                  }}
                  className={`w-full text-left px-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0 flex items-start gap-2 ${
                    i === activeIndex
                      ? 'bg-slate-100 dark:bg-slate-800'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
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
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  )
}

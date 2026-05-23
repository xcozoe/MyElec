import { useMemo, useState } from 'react'
import type { Tableau } from '../types/electrical'

export interface SearchHit {
  type: 'tableau' | 'rangee' | 'disjoncteur'
  tableauId: string
  rangeeId?: string
  disjoncteurId?: string
  label: string
  sublabel: string
  matchedField: string
}

function matches(haystack: string | undefined, needle: string): boolean {
  if (!haystack) return false
  return haystack.toLowerCase().includes(needle)
}

export function useSearch(tableaux: Tableau[]) {
  const [query, setQuery] = useState('')

  const results: SearchHit[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const hits: SearchHit[] = []
    for (const t of tableaux) {
      if (
        matches(t.id, q) ||
        matches(t.nom, q) ||
        matches(t.emplacement, q) ||
        matches(t.notes, q)
      ) {
        hits.push({
          type: 'tableau',
          tableauId: t.id,
          label: t.nom,
          sublabel: t.emplacement,
          matchedField: matches(t.id, q) ? 'id' : 'tableau',
        })
      }
      for (const r of t.rangees) {
        if (
          matches(r.id, q) ||
          matches(r.libelle, q) ||
          matches(r.notes, q)
        ) {
          hits.push({
            type: 'rangee',
            tableauId: t.id,
            rangeeId: r.id,
            label: r.libelle,
            sublabel: `${t.nom} — Rangée ${r.numero}`,
            matchedField: 'rangée',
          })
        }
        for (const d of r.disjoncteurs) {
          if (
            matches(d.id, q) ||
            matches(d.etiquette, q) ||
            matches(d.notes, q) ||
            matches(d.appareil_pilote, q)
          ) {
            hits.push({
              type: 'disjoncteur',
              tableauId: t.id,
              rangeeId: r.id,
              disjoncteurId: d.id,
              label: `${d.id} — ${d.etiquette}`,
              sublabel: `${t.nom} · ${r.libelle}`,
              matchedField: matches(d.id, q) ? 'id' : 'disjoncteur',
            })
          }
        }
      }
    }
    return hits.slice(0, 40)
  }, [tableaux, query])

  return { query, setQuery, results }
}

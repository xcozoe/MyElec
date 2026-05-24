import { useMemo, useState } from 'react'
import type {
  AppareilFixe,
  EndPoint,
  Ligne,
  Piece,
  Tableau,
  Volet,
} from '../types/electrical'

export type SearchHitType =
  | 'tableau'
  | 'rangee'
  | 'disjoncteur'
  | 'piece'
  | 'ligne'
  | 'endpoint'
  | 'appareil'
  | 'volet'

export interface SearchHit {
  type: SearchHitType
  label: string
  sublabel: string
  matchedField: string
  // Identifiants pour la navigation (selon le type)
  tableauId?: string
  rangeeId?: string
  disjoncteurId?: string
  pieceId?: string
  ligneId?: string
  endpointId?: string
  appareilId?: string
  voletId?: string
}

function matches(haystack: string | undefined, needle: string): boolean {
  if (!haystack) return false
  return haystack.toLowerCase().includes(needle)
}

export interface SearchData {
  tableaux: Tableau[]
  pieces: Piece[]
  lignes: Ligne[]
  endpoints: EndPoint[]
  appareils: AppareilFixe[]
  volets: Volet[]
}

export function useSearch(data: SearchData) {
  const [query, setQuery] = useState('')

  const results: SearchHit[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const hits: SearchHit[] = []

    // Tableaux + rangées + disjoncteurs
    for (const t of data.tableaux) {
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
        if (matches(r.id, q) || matches(r.libelle, q) || matches(r.notes, q)) {
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

    // Pièces
    for (const p of data.pieces) {
      if (
        matches(p.id, q) ||
        matches(p.trigramme, q) ||
        matches(p.nom, q) ||
        matches(p.notes, q)
      ) {
        hits.push({
          type: 'piece',
          pieceId: p.id,
          label: p.nom,
          sublabel: `Pièce · ${p.trigramme} · ${p.niveau}`,
          matchedField: matches(p.trigramme, q) ? 'trigramme' : 'pièce',
        })
      }
    }

    // Lignes
    for (const l of data.lignes) {
      if (
        matches(l.id, q) ||
        matches(l.libelle, q) ||
        matches(l.parcours, q) ||
        matches(l.notes, q)
      ) {
        hits.push({
          type: 'ligne',
          ligneId: l.id,
          label: `${l.id} — ${l.libelle}`,
          sublabel: `Ligne · source ${l.disjoncteur_id}`,
          matchedField: matches(l.id, q) ? 'id' : 'ligne',
        })
      }
    }

    // End-points
    const pieceById = new Map(data.pieces.map((p) => [p.id, p]))
    for (const e of data.endpoints) {
      if (
        matches(e.id, q) ||
        matches(e.usage_principal, q) ||
        matches(e.notes, q) ||
        matches(e.position_detail, q)
      ) {
        const piece = pieceById.get(e.piece_id)
        hits.push({
          type: 'endpoint',
          endpointId: e.id,
          pieceId: e.piece_id,
          label: `${e.id}${e.usage_principal ? ' — ' + e.usage_principal : ''}`,
          sublabel: `End-point · ${piece?.nom ?? e.piece_id}`,
          matchedField: matches(e.id, q) ? 'id' : 'end-point',
        })
      }
    }

    // Appareils fixes
    for (const a of data.appareils) {
      if (
        matches(a.id, q) ||
        matches(a.nom, q) ||
        matches(a.marque, q) ||
        matches(a.modele, q) ||
        matches(a.usage_principal, q) ||
        matches(a.notes, q)
      ) {
        const piece = pieceById.get(a.piece_id)
        hits.push({
          type: 'appareil',
          appareilId: a.id,
          pieceId: a.piece_id,
          label: a.nom,
          sublabel: `Appareil · ${piece?.nom ?? a.piece_id} · ${a.id}`,
          matchedField: matches(a.id, q) ? 'id' : 'appareil',
        })
      }
    }

    // Volets
    for (const v of data.volets) {
      if (matches(v.id, q) || matches(v.notes, q)) {
        const piece = pieceById.get(v.piece_id)
        hits.push({
          type: 'volet',
          voletId: v.id,
          pieceId: v.piece_id,
          label: v.id,
          sublabel: `Volet · ${piece?.nom ?? v.piece_id} · ${v.type.replace('_', ' ')}`,
          matchedField: matches(v.id, q) ? 'id' : 'volet',
        })
      }
    }

    return hits.slice(0, 50)
  }, [data, query])

  return { query, setQuery, results }
}

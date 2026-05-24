import { useCallback, useEffect, useMemo, useState } from 'react'
import { storage } from '../services/storage'
import {
  creationEntry,
  diffAppareilFixe,
  diffDisjoncteur,
  diffEndPoint,
  diffLigne,
  diffPiece,
  diffRangee,
  diffTableau,
  diffVolet,
  suppressionEntry,
} from '../services/historique'
import type {
  AppareilFixe,
  Disjoncteur,
  EndPoint,
  EntiteType,
  Ligne,
  Modification,
  Piece,
  Rangee,
  Tableau,
  Volet,
} from '../types/electrical'

export interface FlatCollection<T> {
  upsert: (item: T, description?: string) => Promise<void>
  remove: (id: string, description?: string) => Promise<void>
}

export interface Store {
  tableaux: Tableau[]
  pieces: Piece[]
  lignes: Ligne[]
  endpoints: EndPoint[]
  volets: Volet[]
  appareils: AppareilFixe[]
  modifications: Modification[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>

  // Tableaux (CRUD imbriqué — rangées, disjoncteurs)
  upsertTableau: (tableau: Tableau, description?: string) => Promise<void>
  removeTableau: (tableauId: string, description?: string) => Promise<void>
  upsertRangee: (
    tableauId: string,
    rangee: Rangee,
    description?: string,
  ) => Promise<void>
  removeRangee: (
    tableauId: string,
    rangeeId: string,
    description?: string,
  ) => Promise<void>
  upsertDisjoncteur: (
    tableauId: string,
    rangeeId: string,
    disjoncteur: Disjoncteur,
    description?: string,
  ) => Promise<void>
  removeDisjoncteur: (
    tableauId: string,
    rangeeId: string,
    disjoncteurId: string,
    description?: string,
  ) => Promise<void>
  moveDisjoncteur: (
    tableauId: string,
    disjoncteurId: string,
    targetRangeeId: string,
    targetIndex: number,
    description?: string,
  ) => Promise<void>

  // Entités plates (Phase 2)
  pieceOps: FlatCollection<Piece>
  ligneOps: FlatCollection<Ligne>
  endpointOps: FlatCollection<EndPoint>
  voletOps: FlatCollection<Volet>
  appareilOps: FlatCollection<AppareilFixe>

  importAll: (payload: ImportPayload) => Promise<void>
}

export interface ImportPayload {
  tableaux: Tableau[]
  pieces?: Piece[]
  lignes?: Ligne[]
  endpoints?: EndPoint[]
  volets?: Volet[]
  appareils?: AppareilFixe[]
  modifications: Modification[]
}

function findTableau(tableaux: Tableau[], id: string): Tableau | undefined {
  return tableaux.find((t) => t.id === id)
}

function findRangee(tableau: Tableau, id: string): Rangee | undefined {
  return tableau.rangees.find((r) => r.id === id)
}

function findDisjoncteur(rangee: Rangee, id: string): Disjoncteur | undefined {
  return rangee.disjoncteurs.find((d) => d.id === id)
}

export function useStore(): Store {
  const [tableaux, setTableaux] = useState<Tableau[]>([])
  const [pieces, setPieces] = useState<Piece[]>([])
  const [lignes, setLignes] = useState<Ligne[]>([])
  const [endpoints, setEndpoints] = useState<EndPoint[]>([])
  const [volets, setVolets] = useState<Volet[]>([])
  const [appareils, setAppareils] = useState<AppareilFixe[]>([])
  const [modifications, setModifications] = useState<Modification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [t, p, l, e, v, a, m] = await Promise.all([
        storage.tableaux.load(),
        storage.pieces.load(),
        storage.lignes.load(),
        storage.endpoints.load(),
        storage.volets.load(),
        storage.appareils.load(),
        storage.modifications.load(),
      ])
      setTableaux(t)
      setPieces(p)
      setLignes(l)
      setEndpoints(e)
      setVolets(v)
      setAppareils(a)
      setModifications(m)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const appendModifications = useCallback(
    async (mods: Modification[]) => {
      if (mods.length === 0) return
      setModifications((prev) => [...prev, ...mods])
      for (const m of mods) {
        await storage.modifications.append(m)
      }
    },
    [],
  )

  // ---------- CRUD Tableaux (imbriqué) ----------

  const persistTableaux = useCallback(
    async (next: Tableau[], mods: Modification[]) => {
      setTableaux(next)
      try {
        await storage.tableaux.save(next)
        await appendModifications(mods)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        await reload()
        throw e
      }
    },
    [appendModifications, reload],
  )

  const upsertTableau = useCallback(
    async (tableau: Tableau, description?: string) => {
      const existing = findTableau(tableaux, tableau.id)
      const next = existing
        ? tableaux.map((t) => (t.id === tableau.id ? tableau : t))
        : [...tableaux, tableau]
      const mods = existing
        ? diffTableau(existing, tableau, description)
        : [creationEntry('tableau', tableau.id, description)]
      await persistTableaux(next, mods)
    },
    [tableaux, persistTableaux],
  )

  const removeTableau = useCallback(
    async (tableauId: string, description?: string) => {
      const next = tableaux.filter((t) => t.id !== tableauId)
      const mods = [suppressionEntry('tableau', tableauId, description)]
      await persistTableaux(next, mods)
    },
    [tableaux, persistTableaux],
  )

  const upsertRangee = useCallback(
    async (tableauId: string, rangee: Rangee, description?: string) => {
      const tableau = findTableau(tableaux, tableauId)
      if (!tableau) throw new Error(`Tableau ${tableauId} introuvable`)
      const existing = findRangee(tableau, rangee.id)
      const updatedTableau: Tableau = {
        ...tableau,
        rangees: existing
          ? tableau.rangees.map((r) => (r.id === rangee.id ? rangee : r))
          : [...tableau.rangees, rangee],
      }
      const next = tableaux.map((t) =>
        t.id === tableauId ? updatedTableau : t,
      )
      const mods = existing
        ? diffRangee(existing, rangee, description)
        : [creationEntry('rangee', rangee.id, description)]
      await persistTableaux(next, mods)
    },
    [tableaux, persistTableaux],
  )

  const removeRangee = useCallback(
    async (tableauId: string, rangeeId: string, description?: string) => {
      const tableau = findTableau(tableaux, tableauId)
      if (!tableau) throw new Error(`Tableau ${tableauId} introuvable`)
      const updatedTableau: Tableau = {
        ...tableau,
        rangees: tableau.rangees.filter((r) => r.id !== rangeeId),
      }
      const next = tableaux.map((t) =>
        t.id === tableauId ? updatedTableau : t,
      )
      const mods = [suppressionEntry('rangee', rangeeId, description)]
      await persistTableaux(next, mods)
    },
    [tableaux, persistTableaux],
  )

  const upsertDisjoncteur = useCallback(
    async (
      tableauId: string,
      rangeeId: string,
      disjoncteur: Disjoncteur,
      description?: string,
    ) => {
      const tableau = findTableau(tableaux, tableauId)
      if (!tableau) throw new Error(`Tableau ${tableauId} introuvable`)
      const rangee = findRangee(tableau, rangeeId)
      if (!rangee)
        throw new Error(`Rangée ${rangeeId} introuvable dans ${tableauId}`)
      const existing = findDisjoncteur(rangee, disjoncteur.id)
      const updatedRangee: Rangee = {
        ...rangee,
        disjoncteurs: existing
          ? rangee.disjoncteurs.map((d) =>
              d.id === disjoncteur.id ? disjoncteur : d,
            )
          : [...rangee.disjoncteurs, disjoncteur],
      }
      const updatedTableau: Tableau = {
        ...tableau,
        rangees: tableau.rangees.map((r) =>
          r.id === rangeeId ? updatedRangee : r,
        ),
      }
      const next = tableaux.map((t) =>
        t.id === tableauId ? updatedTableau : t,
      )
      const mods = existing
        ? diffDisjoncteur(existing, disjoncteur, description)
        : [creationEntry('disjoncteur', disjoncteur.id, description)]
      await persistTableaux(next, mods)
    },
    [tableaux, persistTableaux],
  )

  const removeDisjoncteur = useCallback(
    async (
      tableauId: string,
      rangeeId: string,
      disjoncteurId: string,
      description?: string,
    ) => {
      const tableau = findTableau(tableaux, tableauId)
      if (!tableau) throw new Error(`Tableau ${tableauId} introuvable`)
      const rangee = findRangee(tableau, rangeeId)
      if (!rangee)
        throw new Error(`Rangée ${rangeeId} introuvable dans ${tableauId}`)
      const updatedRangee: Rangee = {
        ...rangee,
        disjoncteurs: rangee.disjoncteurs.filter((d) => d.id !== disjoncteurId),
      }
      const updatedTableau: Tableau = {
        ...tableau,
        rangees: tableau.rangees.map((r) =>
          r.id === rangeeId ? updatedRangee : r,
        ),
      }
      const next = tableaux.map((t) =>
        t.id === tableauId ? updatedTableau : t,
      )
      const mods = [suppressionEntry('disjoncteur', disjoncteurId, description)]
      await persistTableaux(next, mods)
    },
    [tableaux, persistTableaux],
  )

  const moveDisjoncteur = useCallback(
    async (
      tableauId: string,
      disjoncteurId: string,
      targetRangeeId: string,
      targetIndex: number,
      description?: string,
    ) => {
      const tableau = findTableau(tableaux, tableauId)
      if (!tableau) throw new Error(`Tableau ${tableauId} introuvable`)

      let sourceRangee: Rangee | undefined
      let movedDj: Disjoncteur | undefined
      for (const r of tableau.rangees) {
        const d = findDisjoncteur(r, disjoncteurId)
        if (d) {
          sourceRangee = r
          movedDj = d
          break
        }
      }
      if (!sourceRangee || !movedDj)
        throw new Error(`Disjoncteur ${disjoncteurId} introuvable`)

      const targetRangee = findRangee(tableau, targetRangeeId)
      if (!targetRangee)
        throw new Error(`Rangée cible ${targetRangeeId} introuvable`)

      const isCrossRow = sourceRangee.id !== targetRangee.id

      // Si on traverse une rangée, on retire le rattachement au différentiel
      // qui était dans la rangée source — il ne fait plus sens.
      const updatedDj: Disjoncteur = isCrossRow
        ? { ...movedDj, differentiel_parent_id: undefined }
        : movedDj

      const renumber = (items: Disjoncteur[]) =>
        items.map((d, i) => ({ ...d, position: i + 1 }))

      let newSourceItems: Disjoncteur[]
      let newTargetItems: Disjoncteur[]

      if (isCrossRow) {
        // Retire de la source
        newSourceItems = renumber(
          [...sourceRangee.disjoncteurs]
            .filter((d) => d.id !== disjoncteurId)
            .sort((a, b) => a.position - b.position),
        )
        // Insère dans la cible à targetIndex
        const targetSorted = [...targetRangee.disjoncteurs].sort(
          (a, b) => a.position - b.position,
        )
        const clamped = Math.max(0, Math.min(targetIndex, targetSorted.length))
        targetSorted.splice(clamped, 0, updatedDj)
        newTargetItems = renumber(targetSorted)
      } else {
        // Réordre intra-rangée
        const sorted = [...sourceRangee.disjoncteurs].sort(
          (a, b) => a.position - b.position,
        )
        const oldIndex = sorted.findIndex((d) => d.id === disjoncteurId)
        if (oldIndex === -1)
          throw new Error('Position source introuvable')
        const [picked] = sorted.splice(oldIndex, 1)
        const clamped = Math.max(0, Math.min(targetIndex, sorted.length))
        sorted.splice(clamped, 0, picked)
        newSourceItems = renumber(sorted)
        newTargetItems = newSourceItems
      }

      const updatedTableau: Tableau = {
        ...tableau,
        rangees: tableau.rangees.map((r) => {
          if (isCrossRow) {
            if (r.id === sourceRangee!.id) return { ...r, disjoncteurs: newSourceItems }
            if (r.id === targetRangee.id) return { ...r, disjoncteurs: newTargetItems }
            return r
          }
          if (r.id === sourceRangee!.id) return { ...r, disjoncteurs: newSourceItems }
          return r
        }),
      }
      const next = tableaux.map((t) =>
        t.id === tableauId ? updatedTableau : t,
      )

      const newPosition =
        newTargetItems.find((d) => d.id === disjoncteurId)?.position ?? 0

      const summary = isCrossRow
        ? `Disjoncteur ${disjoncteurId} déplacé de la rangée ${sourceRangee.id} vers ${targetRangee.id} (position ${newPosition}). differentiel_parent_id réinitialisé.`
        : `Disjoncteur ${disjoncteurId} réordonné dans ${sourceRangee.id} (position ${newPosition}).`

      const mods: Modification[] = [
        {
          id:
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `mod-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          date: new Date().toISOString(),
          type: 'modification',
          entite: 'disjoncteur',
          entite_id: disjoncteurId,
          champ_modifie: isCrossRow ? 'rangee_id + position' : 'position',
          ancienne_valeur: `${sourceRangee.id}:${movedDj.position}`,
          nouvelle_valeur: `${targetRangee.id}:${newPosition}`,
          description: description ?? summary,
        },
      ]

      await persistTableaux(next, mods)
    },
    [tableaux, persistTableaux],
  )

  // ---------- CRUD entités plates (factory) ----------

  function useFlatOps<T extends { id: string }>(
    items: T[],
    setItems: React.Dispatch<React.SetStateAction<T[]>>,
    save: (items: T[]) => Promise<unknown>,
    diffFn: (b: T, a: T, d?: string) => Modification[],
    entite: EntiteType,
  ): FlatCollection<T> {
    const upsert = useCallback(
      async (item: T, description?: string) => {
        const existing = items.find((x) => x.id === item.id)
        const next = existing
          ? items.map((x) => (x.id === item.id ? item : x))
          : [...items, item]
        const mods = existing
          ? diffFn(existing, item, description)
          : [creationEntry(entite, item.id, description)]
        setItems(next)
        try {
          await save(next)
          await appendModifications(mods)
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err))
          await reload()
          throw err
        }
      },
      [items, setItems, save, diffFn, entite],
    )
    const remove = useCallback(
      async (id: string, description?: string) => {
        const next = items.filter((x) => x.id !== id)
        const mods = [suppressionEntry(entite, id, description)]
        setItems(next)
        try {
          await save(next)
          await appendModifications(mods)
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err))
          await reload()
          throw err
        }
      },
      [items, setItems, save, entite],
    )
    return useMemo(() => ({ upsert, remove }), [upsert, remove])
  }

  const pieceOps = useFlatOps(
    pieces,
    setPieces,
    storage.pieces.save,
    diffPiece,
    'piece',
  )
  const ligneOps = useFlatOps(
    lignes,
    setLignes,
    storage.lignes.save,
    diffLigne,
    'ligne',
  )
  const endpointOps = useFlatOps(
    endpoints,
    setEndpoints,
    storage.endpoints.save,
    diffEndPoint,
    'endpoint',
  )
  const voletOps = useFlatOps(
    volets,
    setVolets,
    storage.volets.save,
    diffVolet,
    'volet',
  )
  const appareilOps = useFlatOps(
    appareils,
    setAppareils,
    storage.appareils.save,
    diffAppareilFixe,
    'appareil_fixe',
  )

  // ---------- Import unifié ----------

  const importAll = useCallback(
    async (payload: ImportPayload) => {
      const tArr = payload.tableaux
      const pArr = payload.pieces ?? []
      const lArr = payload.lignes ?? []
      const eArr = payload.endpoints ?? []
      const vArr = payload.volets ?? []
      const aArr = payload.appareils ?? []
      const mArr = payload.modifications
      setTableaux(tArr)
      setPieces(pArr)
      setLignes(lArr)
      setEndpoints(eArr)
      setVolets(vArr)
      setAppareils(aArr)
      setModifications(mArr)
      await Promise.all([
        storage.tableaux.save(tArr),
        storage.pieces.save(pArr),
        storage.lignes.save(lArr),
        storage.endpoints.save(eArr),
        storage.volets.save(vArr),
        storage.appareils.save(aArr),
        storage.modifications.save(mArr),
      ])
    },
    [],
  )

  return useMemo(
    () => ({
      tableaux,
      pieces,
      lignes,
      endpoints,
      volets,
      appareils,
      modifications,
      loading,
      error,
      reload,
      upsertTableau,
      removeTableau,
      upsertRangee,
      removeRangee,
      upsertDisjoncteur,
      removeDisjoncteur,
      moveDisjoncteur,
      pieceOps,
      ligneOps,
      endpointOps,
      voletOps,
      appareilOps,
      importAll,
    }),
    [
      tableaux,
      pieces,
      lignes,
      endpoints,
      volets,
      appareils,
      modifications,
      loading,
      error,
      reload,
      upsertTableau,
      removeTableau,
      upsertRangee,
      removeRangee,
      upsertDisjoncteur,
      removeDisjoncteur,
      moveDisjoncteur,
      pieceOps,
      ligneOps,
      endpointOps,
      voletOps,
      appareilOps,
      importAll,
    ],
  )
}

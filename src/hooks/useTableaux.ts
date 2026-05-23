import { useCallback, useEffect, useMemo, useState } from 'react'
import { storage } from '../services/storage'
import {
  creationEntry,
  diffDisjoncteur,
  diffRangee,
  diffTableau,
  suppressionEntry,
} from '../services/historique'
import type {
  Disjoncteur,
  Modification,
  Rangee,
  Tableau,
} from '../types/electrical'

export interface MyElecState {
  tableaux: Tableau[]
  modifications: Modification[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>

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

  importAll: (
    tableaux: Tableau[],
    modifications: Modification[],
  ) => Promise<void>
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

export function useTableaux(): MyElecState {
  const [tableaux, setTableaux] = useState<Tableau[]>([])
  const [modifications, setModifications] = useState<Modification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [t, m] = await Promise.all([
        storage.loadTableaux(),
        storage.loadModifications(),
      ])
      setTableaux(t)
      setModifications(m)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const persistTableaux = useCallback(
    async (next: Tableau[], newMods: Modification[]) => {
      setTableaux(next)
      if (newMods.length > 0) {
        setModifications((prev) => [...prev, ...newMods])
      }
      try {
        await storage.saveTableaux(next)
        for (const mod of newMods) {
          await storage.appendModification(mod)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        // Revenir à l'état du disque en cas d'erreur
        await reload()
        throw e
      }
    },
    [reload],
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
      const next = tableaux.map((t) => (t.id === tableauId ? updatedTableau : t))
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
      const next = tableaux.map((t) => (t.id === tableauId ? updatedTableau : t))
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
      const next = tableaux.map((t) => (t.id === tableauId ? updatedTableau : t))
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
      const next = tableaux.map((t) => (t.id === tableauId ? updatedTableau : t))
      const mods = [suppressionEntry('disjoncteur', disjoncteurId, description)]
      await persistTableaux(next, mods)
    },
    [tableaux, persistTableaux],
  )

  const importAll = useCallback(
    async (
      newTableaux: Tableau[],
      newModifications: Modification[],
    ) => {
      setTableaux(newTableaux)
      setModifications(newModifications)
      await storage.saveTableaux(newTableaux)
      await storage.saveModifications(newModifications)
    },
    [],
  )

  return useMemo(
    () => ({
      tableaux,
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
      importAll,
    }),
    [
      tableaux,
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
      importAll,
    ],
  )
}

import { describe, expect, it } from 'vitest'
import {
  creationEntry,
  diffDisjoncteur,
  diffLigne,
  suppressionEntry,
} from './historique'
import type { Disjoncteur, Ligne } from '../types/electrical'

const dj = (over: Partial<Disjoncteur>): Disjoncteur => ({
  id: 'TGBT-R1-1',
  position: 1,
  etiquette: 'Frigo',
  type_protection: 'disjoncteur',
  calibre: 'C16',
  poles: 'mono',
  phase_affectation: 'L1',
  statut: 'actif',
  ...over,
})

describe('creationEntry / suppressionEntry', () => {
  it('crée une entrée de création typée avec un libellé par défaut', () => {
    const e = creationEntry('disjoncteur', 'TGBT-R1-1')
    expect(e.type).toBe('creation')
    expect(e.entite).toBe('disjoncteur')
    expect(e.entite_id).toBe('TGBT-R1-1')
    expect(e.description).toContain('TGBT-R1-1')
    expect(e.id).toBeTruthy()
    expect(Number.isNaN(Date.parse(e.date))).toBe(false)
  })

  it('respecte une description personnalisée', () => {
    expect(suppressionEntry('ligne', 'L-PC', 'motif perso').description).toBe(
      'motif perso',
    )
  })
})

describe('diffDisjoncteur', () => {
  it('ne produit aucune entrée si rien ne change', () => {
    const a = dj({})
    expect(diffDisjoncteur(a, dj({}))).toEqual([])
  })

  it('produit une entrée par champ suivi modifié', () => {
    const before = dj({})
    const after = dj({ etiquette: 'Congélateur', calibre: 'C20' })
    const mods = diffDisjoncteur(before, after)
    expect(mods).toHaveLength(2)
    const champs = mods.map((m) => m.champ_modifie).sort()
    expect(champs).toEqual(['calibre', 'etiquette'])
    const etq = mods.find((m) => m.champ_modifie === 'etiquette')!
    expect(etq.ancienne_valeur).toBe('Frigo')
    expect(etq.nouvelle_valeur).toBe('Congélateur')
    expect(etq.type).toBe('modification')
  })

  it("ne suit pas le champ 'id' (le renommage est géré à part)", () => {
    const mods = diffDisjoncteur(dj({}), dj({ id: 'AUTRE-ID' }))
    expect(mods).toEqual([])
  })
})

describe('diffLigne', () => {
  const ligne = (over: Partial<Ligne>): Ligne => ({
    id: 'L-PC',
    libelle: 'Prises séjour',
    disjoncteur_id: 'TGBT-R1-1',
    ...over,
  })

  it('formate les valeurs optionnelles et numériques', () => {
    const mods = diffLigne(ligne({}), ligne({ section_mm2: 2.5 }))
    expect(mods).toHaveLength(1)
    expect(mods[0].champ_modifie).toBe('section_mm2')
    expect(mods[0].ancienne_valeur).toBeUndefined()
    expect(mods[0].nouvelle_valeur).toBe('2.5')
  })
})

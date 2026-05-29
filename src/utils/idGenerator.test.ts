import { describe, expect, it } from 'vitest'
import {
  appareilId,
  endpointId,
  getTrigramme,
  ligneIdFromDisjoncteur,
  nextNumeroAppareil,
  nextNumeroEndpoint,
  nextNumeroVolet,
  voletId,
} from './idGenerator'
import type { AppareilFixe, EndPoint, Ligne, Piece, Volet } from '../types/electrical'

const ep = (over: Partial<EndPoint>): EndPoint => ({
  id: 'x',
  type: 'PC',
  piece_id: 'CUI',
  mur: 'ME',
  numero: 1,
  ...over,
})

describe('nextNumeroEndpoint', () => {
  it('vaut 1 quand aucun end-point ne correspond', () => {
    expect(nextNumeroEndpoint([], 'PC', 'CUI', 'ME')).toBe(1)
  })

  it('incrémente sur le max du (type, pièce, mur)', () => {
    const list = [
      ep({ numero: 1 }),
      ep({ numero: 3 }),
      ep({ numero: 2, mur: 'MD' }), // autre mur → ignoré
      ep({ numero: 9, type: 'PL' }), // autre type → ignoré
      ep({ numero: 5, piece_id: 'SDB' }), // autre pièce → ignoré
    ]
    expect(nextNumeroEndpoint(list, 'PC', 'CUI', 'ME')).toBe(4)
  })
})

describe('endpointId / voletId / appareilId', () => {
  it('compose les identifiants attendus', () => {
    expect(endpointId('PC', 'CUI', 'ME', 2)).toBe('PC_CUI_ME_2')
    expect(voletId('CH1', 3)).toBe('VR_CH1_3')
    expect(appareilId('CUI', 1)).toBe('AP_CUI_1')
  })
})

describe('nextNumeroVolet / nextNumeroAppareil', () => {
  it('numérotation par pièce', () => {
    const volets: Volet[] = [
      { id: 'a', piece_id: 'CH1', numero: 1, type: 'volet_roulant', motorisation: 'electrique_filaire' },
      { id: 'b', piece_id: 'CH1', numero: 2, type: 'volet_roulant', motorisation: 'electrique_filaire' },
      { id: 'c', piece_id: 'SDB', numero: 5, type: 'volet_roulant', motorisation: 'electrique_filaire' },
    ]
    expect(nextNumeroVolet(volets, 'CH1')).toBe(3)
    expect(nextNumeroVolet(volets, 'SEJ')).toBe(1)

    const apps: AppareilFixe[] = [
      { id: 'a', piece_id: 'CUI', numero: 4, nom: 'Four', categorie: 'cuisson', profil_usage: 'intermittent' },
    ]
    expect(nextNumeroAppareil(apps, 'CUI')).toBe(5)
    expect(nextNumeroAppareil(apps, 'SDB')).toBe(1)
  })
})

describe('ligneIdFromDisjoncteur', () => {
  const mk = (id: string): Ligne => ({ id, libelle: '', disjoncteur_id: 'x' })

  it('préfixe par L- l\'ID du disjoncteur', () => {
    expect(ligneIdFromDisjoncteur('TGBT-R1-3', [])).toBe('L-TGBT-R1-3')
  })

  it('garantit l\'unicité avec un suffixe incrémental', () => {
    const lignes = [mk('L-TGBT-R1-3'), mk('L-TGBT-R1-3-2')]
    expect(ligneIdFromDisjoncteur('TGBT-R1-3', lignes)).toBe('L-TGBT-R1-3-3')
  })
})

describe('getTrigramme', () => {
  const pieces: Piece[] = [
    { id: 'CUI', trigramme: 'CUI', nom: 'Cuisine', niveau: 'Rez de jardin', categorie: 'interieur' },
  ]
  it('renvoie le trigramme de la pièce trouvée', () => {
    expect(getTrigramme(pieces, 'CUI')).toBe('CUI')
  })
  it('renvoie une chaîne vide si la pièce est introuvable (pas de fallback corrompu)', () => {
    expect(getTrigramme(pieces, 'pièce inexistante 42')).toBe('')
  })
})

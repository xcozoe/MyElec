import type {
  AppareilFixe,
  Disjoncteur,
  EndPoint,
  EntiteType,
  Ligne,
  Modification,
  ModificationType,
  Piece,
  Rangee,
  Tableau,
  Volet,
} from '../types/electrical'

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `mod-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function libelleEntite(entite: EntiteType): string {
  switch (entite) {
    case 'tableau':
      return 'Tableau'
    case 'rangee':
      return 'Rangée'
    case 'disjoncteur':
      return 'Disjoncteur'
    case 'piece':
      return 'Pièce'
    case 'ligne':
      return 'Ligne'
    case 'endpoint':
      return 'End-point'
    case 'volet':
      return 'Volet'
    case 'appareil_fixe':
      return 'Appareil fixe'
  }
}

export function creationEntry(
  entite: EntiteType,
  entiteId: string,
  description?: string,
): Modification {
  return {
    id: uuid(),
    date: new Date().toISOString(),
    type: 'creation',
    entite,
    entite_id: entiteId,
    description: description ?? `${libelleEntite(entite)} créé(e) (${entiteId}).`,
  }
}

export function suppressionEntry(
  entite: EntiteType,
  entiteId: string,
  description?: string,
): Modification {
  return {
    id: uuid(),
    date: new Date().toISOString(),
    type: 'suppression',
    entite,
    entite_id: entiteId,
    description:
      description ?? `${libelleEntite(entite)} supprimé(e) (${entiteId}).`,
  }
}

function formatValeur(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function diffFields<T extends object>(
  before: T,
  after: T,
  fields: (keyof T)[],
): { champ: string; ancienne?: string; nouvelle?: string }[] {
  const changes: { champ: string; ancienne?: string; nouvelle?: string }[] = []
  for (const field of fields) {
    const ancienne = formatValeur(before[field])
    const nouvelle = formatValeur(after[field])
    if (ancienne !== nouvelle) {
      changes.push({ champ: String(field), ancienne, nouvelle })
    }
  }
  return changes
}

function makeDiff<T extends { id: string }>(
  entite: EntiteType,
  fields: (keyof T)[],
) {
  const label = libelleEntite(entite)
  return (before: T, after: T, description?: string): Modification[] => {
    return diffFields(before, after, fields).map((change) => ({
      id: uuid(),
      date: new Date().toISOString(),
      type: 'modification' as ModificationType,
      entite,
      entite_id: after.id,
      champ_modifie: change.champ,
      ancienne_valeur: change.ancienne,
      nouvelle_valeur: change.nouvelle,
      description:
        description ??
        `${label} ${after.id} — ${change.champ} : ${change.ancienne ?? '∅'} → ${change.nouvelle ?? '∅'}.`,
    }))
  }
}

// ----- Phase 1 -----

export const diffDisjoncteur = makeDiff<Disjoncteur>('disjoncteur', [
  'etiquette',
  'type_protection',
  'calibre',
  'poles',
  'phase_affectation',
  'differentiel_parent_id',
  'statut',
  'appareil_pilote',
  'photo_url',
  'notes',
  'position',
])

export const diffRangee = makeDiff<Rangee>('rangee', [
  'libelle',
  'phase',
  'numero',
  'differentiel_id',
  'notes',
])

export const diffTableau = makeDiff<Tableau>('tableau', [
  'nom',
  'emplacement',
  'alimentation',
  'arrivee_phases',
  'parent_tableau_id',
  'parent_disjoncteur_id',
  'photo_url',
  'notes',
])

// ----- Phase 2 -----

export const diffPiece = makeDiff<Piece>('piece', [
  'trigramme',
  'nom',
  'niveau',
  'categorie',
  'surface_m2',
  'notes',
])

export const diffLigne = makeDiff<Ligne>('ligne', [
  'libelle',
  'disjoncteur_id',
  'section_mm2',
  'longueur_estimee_m',
  'parcours',
  'notes',
])

export const diffEndPoint = makeDiff<EndPoint>('endpoint', [
  'type',
  'piece_id',
  'ligne_id',
  'mur',
  'numero',
  'position_detail',
  'type_prise',
  'nb_combinees',
  'usage_principal',
  'type_luminaire',
  'commande',
  'puissance_w',
  'nb_sources',
  'lumens_unitaires',
  'alimentation',
  'notes',
])

export const diffVolet = makeDiff<Volet>('volet', [
  'piece_id',
  'numero',
  'mur',
  'type',
  'motorisation',
  'commande_locale',
  'commande_centralisee',
  'largeur_cm',
  'ligne_id',
  'notes',
])

export const diffAppareilFixe = makeDiff<AppareilFixe>('appareil_fixe', [
  'piece_id',
  'numero',
  'nom',
  'categorie',
  'marque',
  'modele',
  'puissance_nominale_w',
  'puissance_pic_w',
  'profil_usage',
  'ligne_id',
  'branche_sur',
  'usage_principal',
  'notes',
])

export { uuid }

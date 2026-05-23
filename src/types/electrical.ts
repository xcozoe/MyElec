export type Phase = 'L1' | 'L2' | 'L3' | 'TRI' | 'inconnue'

export type Poles =
  | 'mono'
  | 'mono_diff'
  | 'bipol_diff'
  | 'tetra'
  | 'tetra_diff'

export type TypeProtection =
  | 'disjoncteur'
  | 'disjoncteur_diff_dedie'
  | 'differentiel_tete_rangee'
  | 'differentiel_tete_tableau'
  | 'differentiel_dedie'
  | 'disjoncteur_branchement'
  | 'contacteur'
  | 'telerupteur'
  | 'horloge'

export type StatutDisjoncteur = 'actif' | 'libre' | 'desaffecte'

export interface Disjoncteur {
  id: string
  position: number
  etiquette: string
  type_protection: TypeProtection
  calibre: string
  poles: Poles
  phase_affectation: Phase
  differentiel_parent_id?: string
  statut: StatutDisjoncteur
  appareil_pilote?: string
  notes?: string
}

export interface Rangee {
  id: string
  numero: number
  libelle: string
  phase: Phase
  differentiel_id?: string
  notes?: string
  disjoncteurs: Disjoncteur[]
}

export interface Tableau {
  id: string
  nom: string
  emplacement: string
  alimentation: 'triphase' | 'monophase'
  arrivee_phases?: 'TRI' | 'L1' | 'L2' | 'L3'
  parent_tableau_id?: string
  parent_disjoncteur_id?: string
  notes?: string
  rangees: Rangee[]
}

export type EntiteType = 'tableau' | 'rangee' | 'disjoncteur'

export type ModificationType = 'creation' | 'modification' | 'suppression'

export interface Modification {
  id: string
  date: string
  type: ModificationType
  entite: EntiteType
  entite_id: string
  champ_modifie?: string
  ancienne_valeur?: string
  nouvelle_valeur?: string
  description: string
  utilisateur?: string
}

export const PHASES: Phase[] = ['L1', 'L2', 'L3', 'TRI', 'inconnue']

export const TYPES_PROTECTION: { value: TypeProtection; label: string }[] = [
  { value: 'disjoncteur', label: 'Disjoncteur' },
  { value: 'disjoncteur_diff_dedie', label: 'Disjoncteur différentiel dédié' },
  { value: 'differentiel_tete_rangee', label: 'Différentiel tête de rangée' },
  { value: 'differentiel_tete_tableau', label: 'Différentiel tête de tableau' },
  { value: 'differentiel_dedie', label: 'Différentiel dédié' },
  { value: 'disjoncteur_branchement', label: 'Disjoncteur de branchement' },
  { value: 'contacteur', label: 'Contacteur' },
  { value: 'telerupteur', label: 'Télérupteur' },
  { value: 'horloge', label: 'Horloge' },
]

export const POLES: { value: Poles; label: string }[] = [
  { value: 'mono', label: 'Mono (1P+N)' },
  { value: 'mono_diff', label: 'Mono différentiel' },
  { value: 'bipol_diff', label: 'Bipolaire différentiel' },
  { value: 'tetra', label: 'Tétrapolaire' },
  { value: 'tetra_diff', label: 'Tétrapolaire différentiel' },
]

export const STATUTS: { value: StatutDisjoncteur; label: string }[] = [
  { value: 'actif', label: 'Actif' },
  { value: 'libre', label: 'Libre' },
  { value: 'desaffecte', label: 'Désaffecté' },
]

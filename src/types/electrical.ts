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
  | 'bornier_repartition'

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
  photo_url?: string
  notes?: string
  /** Suivi perso : la fiche a été complètement traitée/vérifiée. */
  traite?: boolean
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
  photo_url?: string
  notes?: string
  rangees: Rangee[]
}

export type EntiteType =
  | 'tableau'
  | 'rangee'
  | 'disjoncteur'
  | 'piece'
  | 'ligne'
  | 'endpoint'
  | 'volet'
  | 'appareil_fixe'

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
  { value: 'bornier_repartition', label: 'Bornier de répartition (passif)' },
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

// ============================================================================
// Phase 2 — Réseau électrique aval
// ============================================================================

export type Niveau = 'Rez de jardin' | 'Sous-sol' | 'Extérieur' | 'Transversal'
export type CategoriePiece = 'interieur' | 'exterieur' | 'technique' | 'virtuelle'

export interface Piece {
  id: string
  trigramme: string
  nom: string
  niveau: Niveau
  categorie: CategoriePiece
  surface_m2?: number
  notes?: string
}

export interface Ligne {
  id: string
  libelle: string
  disjoncteur_id: string
  section_mm2?: number
  longueur_estimee_m?: number
  parcours?: string
  notes?: string
}

export type EndPointType =
  | 'PC'
  | 'PD'
  | 'ECL'
  | 'IN'
  | 'BT'
  | 'RJ45'
  | 'TV'
  | 'AUTRE'

export type Mur =
  | 'ME'
  | 'MD'
  | 'MF'
  | 'MG'
  | 'PL'
  | 'SO'
  | 'IL'
  | 'PT'
  | 'EF'
  | 'EP'

export type TypePrise = '2P+T' | '2P+T_etanche' | '32A' | 'specialisee'

export type TypeLuminaire =
  | 'plafonnier'
  | 'suspension'
  | 'applique'
  | 'spot_encastre'
  | 'spot_oriente'
  | 'ruban_led'
  | 'exterieur_facade'
  | 'exterieur_jardin'
  | 'projecteur'

export type TypeCommande =
  | 'interrupteur'
  | 'va_et_vient'
  | 'telerupteur'
  | 'detecteur_mouvement'
  | 'detecteur_crepusculaire'
  | 'variateur'
  | 'domotique'
  | 'toujours_allume'

export type AlimentationCommande = 'filaire' | 'pile' | 'autonome'

export interface EndPoint {
  id: string
  type: EndPointType
  piece_id: string
  ligne_id?: string
  mur: Mur
  numero: number
  position_detail?: string

  type_prise?: TypePrise
  nb_combinees?: number
  usage_principal?: string

  type_luminaire?: TypeLuminaire
  commande?: TypeCommande
  puissance_w?: number
  nb_sources?: number
  lumens_unitaires?: number

  // IN / BT uniquement : 'filaire' (par défaut, ligne_id requis),
  // 'pile' (interrupteur sans-fil Hue, Bticino…), 'autonome' (EnOcean).
  alimentation?: AlimentationCommande

  notes?: string
}

export type TypeVolet =
  | 'volet_roulant'
  | 'store_banne'
  | 'store_velux'
  | 'store_interieur'
  | 'brise_soleil'

export type MotorisationVolet =
  | 'electrique_filaire'
  | 'electrique_radio'
  | 'solaire'
  | 'manuel_sangle'
  | 'manuel_manivelle'

export type CommandeLocaleVolet =
  | 'inter_filaire'
  | 'inter_radio'
  | 'aucun'
  | 'domotique'

export interface Volet {
  id: string
  piece_id: string
  numero: number
  mur?: Mur
  type: TypeVolet
  motorisation: MotorisationVolet
  commande_locale?: CommandeLocaleVolet
  commande_centralisee?: 'oui' | 'non' | 'partielle'
  largeur_cm?: number
  ligne_id?: string
  notes?: string
}

export type CategorieAppareil =
  | 'cuisson'
  | 'electromenager'
  | 'chauffage'
  | 'eau_chaude'
  | 'ventilation'
  | 'piscine'
  | 'securite'
  | 'reseau'
  | 'atelier'
  | 'divers'

export type ProfilUsage =
  | 'continu'
  | 'cyclique'
  | 'intermittent'
  | 'occasionnel'
  | 'saisonnier'

export interface AppareilFixe {
  id: string
  piece_id: string
  numero: number
  nom: string
  categorie: CategorieAppareil
  marque?: string
  modele?: string
  puissance_nominale_w?: number
  puissance_pic_w?: number
  profil_usage: ProfilUsage
  ligne_id?: string
  branche_sur?: string
  usage_principal?: string
  notes?: string
}

// ----------------------------------------------------------------------------
// Constantes UI Phase 2
// ----------------------------------------------------------------------------

export const NIVEAUX: Niveau[] = [
  'Rez de jardin',
  'Sous-sol',
  'Extérieur',
  'Transversal',
]

export const CATEGORIES_PIECE: { value: CategoriePiece; label: string }[] = [
  { value: 'interieur', label: 'Intérieur' },
  { value: 'exterieur', label: 'Extérieur' },
  { value: 'technique', label: 'Technique' },
  { value: 'virtuelle', label: 'Virtuelle (transversal)' },
]

export const ENDPOINT_TYPES: { value: EndPointType; label: string }[] = [
  { value: 'PC', label: 'PC — Prise de courant' },
  { value: 'PD', label: 'PD — Prise dédiée' },
  { value: 'ECL', label: 'ECL — Éclairage' },
  { value: 'IN', label: 'IN — Interrupteur' },
  { value: 'BT', label: 'BT — Bouton-poussoir' },
  { value: 'RJ45', label: 'RJ45 — Réseau' },
  { value: 'TV', label: 'TV — Antenne' },
  { value: 'AUTRE', label: 'Autre' },
]

export const MURS: { value: Mur; label: string }[] = [
  { value: 'ME', label: 'Entrée' },
  { value: 'MD', label: 'Droite' },
  { value: 'MF', label: 'Face' },
  { value: 'MG', label: 'Gauche' },
  { value: 'PL', label: 'Plafond' },
  { value: 'SO', label: 'Sol' },
  { value: 'IL', label: 'Îlot' },
  { value: 'PT', label: 'Plan de travail' },
  { value: 'EF', label: 'Extérieur façade' },
  { value: 'EP', label: 'Extérieur périmétrique' },
]

export const TYPES_PRISE: { value: TypePrise; label: string }[] = [
  { value: '2P+T', label: '2P+T standard 16 A' },
  { value: '2P+T_etanche', label: '2P+T étanche IP44+' },
  { value: '32A', label: '32 A (plaque, four)' },
  { value: 'specialisee', label: 'Spécialisée' },
]

export const TYPES_LUMINAIRE: { value: TypeLuminaire; label: string }[] = [
  { value: 'plafonnier', label: 'Plafonnier' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'applique', label: 'Applique' },
  { value: 'spot_encastre', label: 'Spot encastré' },
  { value: 'spot_oriente', label: 'Spot orienté' },
  { value: 'ruban_led', label: 'Ruban LED' },
  { value: 'exterieur_facade', label: 'Extérieur façade' },
  { value: 'exterieur_jardin', label: 'Extérieur jardin' },
  { value: 'projecteur', label: 'Projecteur' },
]

export const ALIMENTATIONS_COMMANDE: { value: AlimentationCommande; label: string }[] = [
  { value: 'filaire', label: 'Filaire (ligne électrique)' },
  { value: 'pile', label: 'Sans-fil — pile' },
  { value: 'autonome', label: 'Sans-fil — autonome (EnOcean…)' },
]

export const TYPES_COMMANDE: { value: TypeCommande; label: string }[] = [
  { value: 'interrupteur', label: 'Interrupteur' },
  { value: 'va_et_vient', label: 'Va-et-vient' },
  { value: 'telerupteur', label: 'Télérupteur' },
  { value: 'detecteur_mouvement', label: 'Détecteur de mouvement' },
  { value: 'detecteur_crepusculaire', label: 'Détecteur crépusculaire' },
  { value: 'variateur', label: 'Variateur' },
  { value: 'domotique', label: 'Domotique' },
  { value: 'toujours_allume', label: 'Toujours allumé' },
]

export const TYPES_VOLET: { value: TypeVolet; label: string }[] = [
  { value: 'volet_roulant', label: 'Volet roulant' },
  { value: 'store_banne', label: 'Store banne' },
  { value: 'store_velux', label: 'Store Velux' },
  { value: 'store_interieur', label: 'Store intérieur' },
  { value: 'brise_soleil', label: 'Brise-soleil' },
]

export const MOTORISATIONS_VOLET: { value: MotorisationVolet; label: string }[] = [
  { value: 'electrique_filaire', label: 'Électrique filaire' },
  { value: 'electrique_radio', label: 'Électrique radio' },
  { value: 'solaire', label: 'Solaire' },
  { value: 'manuel_sangle', label: 'Manuel — sangle' },
  { value: 'manuel_manivelle', label: 'Manuel — manivelle' },
]

export const COMMANDES_LOCALES_VOLET: { value: CommandeLocaleVolet; label: string }[] = [
  { value: 'inter_filaire', label: 'Inter filaire' },
  { value: 'inter_radio', label: 'Inter radio' },
  { value: 'aucun', label: 'Aucun' },
  { value: 'domotique', label: 'Domotique' },
]

export const CATEGORIES_APPAREIL: { value: CategorieAppareil; label: string }[] = [
  { value: 'cuisson', label: 'Cuisson' },
  { value: 'electromenager', label: 'Électroménager' },
  { value: 'chauffage', label: 'Chauffage' },
  { value: 'eau_chaude', label: 'Eau chaude' },
  { value: 'ventilation', label: 'Ventilation' },
  { value: 'piscine', label: 'Piscine' },
  { value: 'securite', label: 'Sécurité' },
  { value: 'reseau', label: 'Réseau' },
  { value: 'atelier', label: 'Atelier' },
  { value: 'divers', label: 'Divers' },
]

export const PROFILS_USAGE: { value: ProfilUsage; label: string }[] = [
  { value: 'continu', label: 'Continu' },
  { value: 'cyclique', label: 'Cyclique' },
  { value: 'intermittent', label: 'Intermittent' },
  { value: 'occasionnel', label: 'Occasionnel' },
  { value: 'saisonnier', label: 'Saisonnier' },
]

export function murLabel(mur: Mur): string {
  return MURS.find((m) => m.value === mur)?.label ?? mur
}

export function endpointTypeLabel(type: EndPointType): string {
  return ENDPOINT_TYPES.find((t) => t.value === type)?.label ?? type
}

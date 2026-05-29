import type {
  AppareilFixe,
  EndPoint,
  EndPointType,
  Ligne,
  Mur,
  Piece,
  Volet,
} from '../types/electrical'

export function nextNumeroEndpoint(
  endpoints: EndPoint[],
  type: EndPointType,
  pieceId: string,
  mur: Mur,
): number {
  const existing = endpoints
    .filter((e) => e.type === type && e.piece_id === pieceId && e.mur === mur)
    .map((e) => e.numero)
  return existing.length > 0 ? Math.max(...existing) + 1 : 1
}

export function endpointId(
  type: EndPointType,
  trigramme: string,
  mur: Mur,
  numero: number,
): string {
  return `${type}_${trigramme}_${mur}_${numero}`
}

export function nextNumeroVolet(volets: Volet[], pieceId: string): number {
  const existing = volets.filter((v) => v.piece_id === pieceId).map((v) => v.numero)
  return existing.length > 0 ? Math.max(...existing) + 1 : 1
}

export function voletId(trigramme: string, numero: number): string {
  return `VR_${trigramme}_${numero}`
}

export function nextNumeroAppareil(
  appareils: AppareilFixe[],
  pieceId: string,
): number {
  const existing = appareils
    .filter((a) => a.piece_id === pieceId)
    .map((a) => a.numero)
  return existing.length > 0 ? Math.max(...existing) + 1 : 1
}

export function appareilId(trigramme: string, numero: number): string {
  return `AP_${trigramme}_${numero}`
}

/**
 * Construit un ID de ligne à partir de l'ID du disjoncteur source
 * (ex : `TGBT-R1-3` → `L-TGBT-R1-3`), en garantissant l'unicité par rapport
 * aux lignes existantes (suffixe `-2`, `-3`… si nécessaire). Le préfixe `L-`
 * respecte la convention de nommage des lignes.
 */
export function ligneIdFromDisjoncteur(
  disjoncteurId: string,
  lignes: Ligne[],
): string {
  const base = `L-${disjoncteurId}`
  if (!lignes.some((l) => l.id === base)) return base
  let n = 2
  while (lignes.some((l) => l.id === `${base}-${n}`)) n++
  return `${base}-${n}`
}

export function getTrigramme(pieces: Piece[], pieceId: string): string {
  // Si la pièce est introuvable, on renvoie une chaîne vide plutôt que de
  // fabriquer un trigramme depuis l'ID brut (qui pourrait contenir des
  // espaces/caractères spéciaux et produire des identifiants corrompus ou
  // non uniques). Les éditeurs traitent un trigramme vide comme "ID non
  // déterminable" et bloquent l'enregistrement.
  return pieces.find((p) => p.id === pieceId)?.trigramme ?? ''
}

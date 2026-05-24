import type {
  AppareilFixe,
  EndPoint,
  EndPointType,
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

export function getTrigramme(pieces: Piece[], pieceId: string): string {
  return pieces.find((p) => p.id === pieceId)?.trigramme ?? pieceId.toUpperCase()
}

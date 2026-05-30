import type {
  AppareilFixe,
  EndPoint,
  Ligne,
  Phase,
  Tableau,
} from '../types/electrical'

/** Abonnement de la maison : 18 kVA triphasé ⇒ 6000 VA par phase. */
export const PUISSANCE_SOUSCRITE_VA = 18000
export const CAPACITE_PAR_PHASE_VA = PUISSANCE_SOUSCRITE_VA / 3

export interface PhasePowerResult {
  /** Charge directe (mono) affectée à chaque phase, en W. */
  mono: { L1: number; L2: number; L3: number }
  /** Total triphasé (réparti ensuite à parts égales sur les 3 phases). */
  tri: number
  /** Charge dont la phase n'a pas pu être déterminée (ligne/disjoncteur). */
  nonAttribue: number
  /** Total par phase = mono + tri/3 (W). */
  parPhase: { L1: number; L2: number; L3: number }
  /** Somme de toutes les charges prises en compte (W). */
  total: number
}

interface StoreLike {
  tableaux: Tableau[]
  lignes: Ligne[]
  endpoints: EndPoint[]
  appareils: AppareilFixe[]
}

/**
 * Estime la charge nominale raccordée par phase, en remontant la chaîne
 * appareil/éclairage → ligne → disjoncteur → phase d'affectation.
 *
 * Ne compte que les charges à puissance connue : appareils fixes
 * (puissance_nominale_w) et points d'éclairage (puissance_w × nb_sources).
 * Les prises (PC/PD), à charge variable, sont ignorées.
 */
export function computePhasePower(store: StoreLike): PhasePowerResult {
  const disjById = new Map<string, Phase>()
  for (const t of store.tableaux) {
    for (const r of t.rangees) {
      for (const d of r.disjoncteurs) {
        disjById.set(d.id, d.phase_affectation)
      }
    }
  }
  const ligneById = new Map<string, Ligne>()
  for (const l of store.lignes) ligneById.set(l.id, l)
  const endpointById = new Map<string, EndPoint>()
  for (const e of store.endpoints) endpointById.set(e.id, e)

  const phaseOfLigne = (ligneId: string | undefined): Phase | undefined => {
    if (!ligneId) return undefined
    const ligne = ligneById.get(ligneId)
    if (!ligne) return undefined
    return disjById.get(ligne.disjoncteur_id)
  }

  const mono = { L1: 0, L2: 0, L3: 0 }
  let tri = 0
  let nonAttribue = 0

  const attribute = (watts: number, phase: Phase | undefined) => {
    if (phase === 'L1' || phase === 'L2' || phase === 'L3') mono[phase] += watts
    else if (phase === 'TRI') tri += watts
    else nonAttribue += watts
  }

  for (const a of store.appareils) {
    const w = a.puissance_nominale_w
    if (!w || w <= 0) continue
    // Rattachement : ligne directe, sinon via la prise sur laquelle il est branché.
    const ligneId =
      a.ligne_id ??
      (a.branche_sur ? endpointById.get(a.branche_sur)?.ligne_id : undefined)
    attribute(w, phaseOfLigne(ligneId))
  }

  for (const e of store.endpoints) {
    if (e.type !== 'ECL') continue
    const unit = e.puissance_w
    if (!unit || unit <= 0) continue
    const w = unit * (e.nb_sources && e.nb_sources > 0 ? e.nb_sources : 1)
    attribute(w, phaseOfLigne(e.ligne_id))
  }

  const parPhase = {
    L1: mono.L1 + tri / 3,
    L2: mono.L2 + tri / 3,
    L3: mono.L3 + tri / 3,
  }
  const total = mono.L1 + mono.L2 + mono.L3 + tri + nonAttribue

  return { mono, tri, nonAttribue, parPhase, total }
}

import type { KeyboardEvent } from 'react'

/**
 * Parse une saisie de champ `<input type="number">` en entier strictement
 * positif. Si la saisie est vide ou invalide (NaN, ≤ 0), on conserve la
 * dernière valeur valide (`fallback`) — ça évite d'enregistrer `0`/`NaN`
 * et donc de générer des identifiants corrompus (ex : `PC_TRI_ME_0`).
 */
export function toPositiveInt(value: string, fallback: number): number {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 ? n : fallback
}

/**
 * Parse une saisie numérique optionnelle (≥ 0). Renvoie `undefined` si le
 * champ est vide ou non numérique — au lieu de laisser passer `NaN` qui
 * serait sérialisé en `null` dans le JSON.
 */
export function toOptionalNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Props à étaler sur un élément non-bouton (ex : `<li>`) rendu cliquable,
 * pour le rendre accessible au clavier (focusable + activation Entrée/Espace)
 * sans dupliquer la logique partout.
 *
 * Le `onKeyDown` ne réagit que si l'événement vient de l'élément lui-même
 * (`e.target === e.currentTarget`), pour ne pas déclencher l'action de la
 * ligne quand on active un bouton imbriqué au clavier.
 */
export function clickableRowProps(onClick: () => void) {
  return {
    onClick,
    role: 'button' as const,
    tabIndex: 0,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.target !== e.currentTarget) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick()
      }
    },
  }
}

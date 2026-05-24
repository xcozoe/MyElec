import type { Phase } from '../types/electrical'

export interface PhaseStyle {
  label: string
  ring: string
  bg: string
  text: string
  dot: string
}

/**
 * Les classes ci-dessous sont définies dans `src/index.css` (`.phase-ring-X`,
 * `.phase-bg-X`, `.phase-text-X`, `.phase-dot-X`) et utilisent `color-mix()`
 * sur les CSS variables `--phase-{X}`. Ces variables sont initialisées avec
 * les couleurs par défaut dans `:root` et sont surchargées à chaud par le
 * SettingsContext quand l'utilisateur change une couleur dans le menu
 * Paramètres. Les composants n'ont donc rien à modifier — ils consomment
 * toujours `PHASE_STYLES[phase].{ring,bg,text,dot}` comme avant.
 */
export const PHASE_STYLES: Record<Phase, PhaseStyle> = {
  L1: {
    label: 'L1',
    ring: 'phase-ring-L1',
    bg: 'phase-bg-L1',
    text: 'phase-text-L1',
    dot: 'phase-dot-L1',
  },
  L2: {
    label: 'L2',
    ring: 'phase-ring-L2',
    bg: 'phase-bg-L2',
    text: 'phase-text-L2',
    dot: 'phase-dot-L2',
  },
  L3: {
    label: 'L3',
    ring: 'phase-ring-L3',
    bg: 'phase-bg-L3',
    text: 'phase-text-L3',
    dot: 'phase-dot-L3',
  },
  TRI: {
    label: 'TRI',
    ring: 'phase-ring-TRI',
    bg: 'phase-bg-TRI',
    text: 'phase-text-TRI',
    dot: 'phase-dot-TRI',
  },
  inconnue: {
    label: '?',
    ring: 'phase-ring-inconnue',
    bg: 'phase-bg-inconnue',
    text: 'phase-text-inconnue',
    dot: 'phase-dot-inconnue',
  },
}

import type { Phase } from '../types/electrical'

export interface PhaseStyle {
  label: string
  ring: string
  bg: string
  text: string
  dot: string
}

export const PHASE_STYLES: Record<Phase, PhaseStyle> = {
  L1: {
    label: 'L1',
    ring: 'ring-amber-400 dark:ring-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-900 dark:text-amber-200',
    dot: 'bg-amber-500',
  },
  L2: {
    label: 'L2',
    ring: 'ring-yellow-400 dark:ring-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-950/40',
    text: 'text-yellow-900 dark:text-yellow-200',
    dot: 'bg-yellow-500',
  },
  L3: {
    label: 'L3',
    ring: 'ring-blue-400 dark:ring-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-900 dark:text-blue-200',
    dot: 'bg-blue-500',
  },
  TRI: {
    label: 'TRI',
    ring: 'ring-emerald-400 dark:ring-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-900 dark:text-emerald-200',
    dot: 'bg-emerald-500',
  },
  inconnue: {
    label: '?',
    ring: 'ring-slate-300 dark:ring-slate-600',
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    text: 'text-slate-700 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
}

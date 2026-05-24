import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Phase } from '../types/electrical'

const STORAGE_KEY = 'myelec.settings.v1'

export type PhaseColorKey = Exclude<Phase, 'inconnue'> | 'inconnue'

export interface PhaseColors {
  L1: string
  L2: string
  L3: string
  TRI: string
  inconnue: string
}

export const DEFAULT_PHASE_COLORS: PhaseColors = {
  L1: '#f59e0b',
  L2: '#eab308',
  L3: '#3b82f6',
  TRI: '#10b981',
  inconnue: '#94a3b8',
}

export const PHASE_COLOR_KEYS: PhaseColorKey[] = ['L1', 'L2', 'L3', 'TRI', 'inconnue']

interface SettingsState {
  phaseColors: PhaseColors
}

interface SettingsContextValue extends SettingsState {
  setPhaseColor: (phase: PhaseColorKey, hex: string) => void
  resetPhaseColors: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

function loadFromStorage(): SettingsState {
  if (typeof localStorage === 'undefined')
    return { phaseColors: { ...DEFAULT_PHASE_COLORS } }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { phaseColors: { ...DEFAULT_PHASE_COLORS } }
    const parsed = JSON.parse(raw) as Partial<SettingsState>
    const phaseColors: PhaseColors = { ...DEFAULT_PHASE_COLORS }
    if (parsed.phaseColors) {
      const incoming = parsed.phaseColors as unknown as Record<string, unknown>
      for (const key of PHASE_COLOR_KEYS) {
        const v = incoming[key]
        if (typeof v === 'string' && isValidHex(v)) phaseColors[key] = v
      }
    }
    return { phaseColors }
  } catch {
    return { phaseColors: { ...DEFAULT_PHASE_COLORS } }
  }
}

function applyToDocument(colors: PhaseColors) {
  if (typeof document === 'undefined') return
  for (const key of PHASE_COLOR_KEYS) {
    document.documentElement.style.setProperty(`--phase-${key}`, colors[key])
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SettingsState>(() => {
    const loaded = loadFromStorage()
    // Applique les couleurs avant le 1er paint pour éviter un flash
    applyToDocument(loaded.phaseColors)
    return loaded
  })

  useEffect(() => {
    applyToDocument(state.phaseColors)
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        // localStorage plein ou désactivé — on ignore
      }
    }
  }, [state])

  const setPhaseColor = useCallback((phase: PhaseColorKey, hex: string) => {
    const normalized = hex.startsWith('#') ? hex : `#${hex}`
    if (!isValidHex(normalized)) return
    setState((prev) => ({
      ...prev,
      phaseColors: { ...prev.phaseColors, [phase]: normalized },
    }))
  }, [])

  const resetPhaseColors = useCallback(() => {
    setState((prev) => ({ ...prev, phaseColors: { ...DEFAULT_PHASE_COLORS } }))
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({
      phaseColors: state.phaseColors,
      setPhaseColor,
      resetPhaseColors,
    }),
    [state.phaseColors, setPhaseColor, resetPhaseColors],
  )

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx
}

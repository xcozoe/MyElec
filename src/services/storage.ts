import type {
  AppareilFixe,
  EndPoint,
  Ligne,
  Modification,
  Piece,
  Tableau,
  Volet,
} from '../types/electrical'

const API_BASE = '/api'

// Source du token : lue à chaque requête (donc reflète la connexion courante).
// AuthContext appelle setAuthTokenProvider au mount pour brancher localStorage.
let tokenProvider: () => string | null = () => null
let onUnauthorized: () => void = () => {}

export function setAuthTokenProvider(provider: () => string | null) {
  tokenProvider = provider
}

/** Appelé quand un appel /api reçoit 401 (session expirée/cassée). */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = tokenProvider()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (res.status === 401) {
    onUnauthorized()
    throw new Error('Session expirée — reconnexion nécessaire.')
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText} on ${path}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

function makeResource<T>(path: string) {
  return {
    load: () => http<T[]>(path),
    save: (items: T[]) =>
      http<{ ok: true }>(path, {
        method: 'PUT',
        body: JSON.stringify(items),
      }),
  }
}

export const storage = {
  tableaux: makeResource<Tableau>('/tableaux'),
  pieces: makeResource<Piece>('/pieces'),
  lignes: makeResource<Ligne>('/lignes'),
  endpoints: makeResource<EndPoint>('/endpoints'),
  volets: makeResource<Volet>('/volets'),
  appareils: makeResource<AppareilFixe>('/appareils-fixes'),

  modifications: {
    load: () => http<Modification[]>('/modifications'),
    save: (items: Modification[]) =>
      http<{ ok: true }>('/modifications', {
        method: 'PUT',
        body: JSON.stringify(items),
      }),
    append: (modification: Modification) =>
      http<{ ok: true }>('/modifications', {
        method: 'POST',
        body: JSON.stringify(modification),
      }),
  },
}

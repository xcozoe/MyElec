import type { Modification, Tableau } from '../types/electrical'

const API_BASE = '/api'

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText} on ${path}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const storage = {
  loadTableaux: () => http<Tableau[]>('/tableaux'),
  saveTableaux: (tableaux: Tableau[]) =>
    http<{ ok: true }>('/tableaux', {
      method: 'PUT',
      body: JSON.stringify(tableaux),
    }),

  loadModifications: () => http<Modification[]>('/modifications'),
  appendModification: (modification: Modification) =>
    http<{ ok: true }>('/modifications', {
      method: 'POST',
      body: JSON.stringify(modification),
    }),
  saveModifications: (modifications: Modification[]) =>
    http<{ ok: true }>('/modifications', {
      method: 'PUT',
      body: JSON.stringify(modifications),
    }),
}

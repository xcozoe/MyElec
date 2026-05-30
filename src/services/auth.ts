/**
 * Client HTTP pour les routes /api/* d'authentification et de profil.
 * Mécanisme identique à MyMemory : Bearer token dans Authorization,
 * stocké en localStorage côté UI par AuthContext.
 */

export interface AuthUser {
  id: string
  name: string
  email: string
  avatar: string
  themeColor: string
  isAdmin: boolean
  active: boolean
}

export interface AuthSuccess {
  token: string
  user: AuthUser
}

/** Vue d'un compte côté administration. */
export interface AdminUser {
  id: string
  name: string
  email: string
  avatar: string
  isAdmin: boolean
  active: boolean
  createdAt: string
}

const API_BASE = '/api'

async function http<T>(path: string, init: RequestInit & { token?: string }): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }
  if (init.token) headers.Authorization = `Bearer ${init.token}`
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const body: unknown = isJson ? await res.json().catch(() => null) : null
  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof (body as { error?: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `Erreur HTTP ${res.status}`
    throw new Error(message)
  }
  return body as T
}

export const authApi = {
  /** Demande d'accès : crée un compte inactif, ne connecte pas. */
  requestAccess: (name: string, password: string) =>
    http<{ ok: true }>('/request-access', {
      method: 'POST',
      body: JSON.stringify({ name, password }),
    }),

  login: (name: string, password: string) =>
    http<AuthSuccess>('/login', {
      method: 'POST',
      body: JSON.stringify({ name, password }),
    }),

  logout: (token: string) =>
    http<{ ok: true }>('/logout', { method: 'POST', token }),

  me: (token: string) => http<{ user: AuthUser }>('/me', { token }),

  updateProfile: (
    token: string,
    patch: Partial<Pick<AuthUser, 'name' | 'email' | 'avatar' | 'themeColor'>>,
  ) =>
    http<{ user: AuthUser }>('/me', {
      method: 'PATCH',
      body: JSON.stringify(patch),
      token,
    }),

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    http<{ ok: true }>('/me/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
      token,
    }),

  deleteAccount: (token: string, password: string) =>
    http<{ ok: true }>('/me/delete', {
      method: 'POST',
      body: JSON.stringify({ password }),
      token,
    }),

  // ----- Administration des comptes -----

  adminListUsers: (token: string) =>
    http<{ users: AdminUser[] }>('/admin/users', { token }),

  adminCreateUser: (
    token: string,
    name: string,
    password: string,
    isAdmin: boolean,
  ) =>
    http<{ user: AdminUser }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify({ name, password, isAdmin }),
      token,
    }),

  adminUpdateUser: (
    token: string,
    id: string,
    patch: { active?: boolean; isAdmin?: boolean },
  ) =>
    http<{ user: AdminUser }>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
      token,
    }),

  adminDeleteUser: (token: string, id: string) =>
    http<{ ok: true }>(`/admin/users/${id}`, { method: 'DELETE', token }),
}

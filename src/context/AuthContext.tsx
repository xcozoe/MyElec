/**
 * AuthContext — gère token + utilisateur courant, persisté en localStorage.
 *
 * Mécanisme calqué sur MyMemory :
 *  - register/login retournent { token, user } ; on stocke token sous "myelec.token".
 *  - Au mount, si un token existe en localStorage, on appelle /api/me pour
 *    rafraîchir l'utilisateur (et détecter une session révoquée côté serveur).
 *  - setAuthTokenProvider expose le token au client storage.ts, qui l'injecte
 *    dans toutes les requêtes /api/* via header Authorization.
 *  - setUnauthorizedHandler force le logout local si un appel reçoit 401.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { authApi, type AuthUser } from '../services/auth'
import {
  setAuthTokenProvider,
  setUnauthorizedHandler,
} from '../services/storage'

const TOKEN_KEY = 'myelec.token'

export type ProfilePatch = Partial<
  Pick<AuthUser, 'name' | 'email' | 'avatar' | 'themeColor'>
>

interface AuthContextValue {
  token: string | null
  user: AuthUser | null
  /** true tant qu'on n'a pas terminé la vérification initiale du token. */
  bootstrapping: boolean
  login: (name: string, password: string) => Promise<void>
  register: (name: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (patch: ProfilePatch) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  deleteAccount: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

function readStoredToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

function writeStoredToken(token: string | null) {
  if (typeof localStorage === 'undefined') return
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredToken())
  const [user, setUser] = useState<AuthUser | null>(null)
  const [bootstrapping, setBootstrapping] = useState<boolean>(() => !!readStoredToken())

  // tokenRef garde la dernière valeur dispo pour les callbacks (storage.ts).
  // On le met à jour **synchroneusement** dans les setters (handleAuthSuccess,
  // logout, etc.) plutôt que via useEffect, pour qu'un fetch déclenché
  // immédiatement après un setToken voie déjà la bonne valeur (les useEffect
  // des composants enfants peuvent se lancer avant celui du parent).
  const tokenRef = useRef<string | null>(token)

  // Branche le client storage : injection Authorization + handler 401.
  useEffect(() => {
    setAuthTokenProvider(() => tokenRef.current)
    setUnauthorizedHandler(() => {
      tokenRef.current = null
      writeStoredToken(null)
      setToken(null)
      setUser(null)
    })
  }, [])

  // Au mount avec un token stocké : récupère l'utilisateur courant.
  // Si le serveur renvoie 401, on tombe dans le handler ci-dessus.
  useEffect(() => {
    if (!token) {
      setBootstrapping(false)
      return
    }
    let cancelled = false
    authApi
      .me(token)
      .then((res) => {
        if (cancelled) return
        setUser(res.user)
      })
      .catch(() => {
        if (cancelled) return
        // L'erreur 401 est déjà gérée par le handler ; pour le reste, on
        // laisse simplement bootstrapping passer à false pour ne pas bloquer
        // l'UI sur une page blanche.
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false)
      })
    return () => {
      cancelled = true
    }
    // On ne veut faire ce check qu'une seule fois, au mount initial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAuthSuccess = useCallback((next: { token: string; user: AuthUser }) => {
    tokenRef.current = next.token
    writeStoredToken(next.token)
    setToken(next.token)
    setUser(next.user)
  }, [])

  const login = useCallback(
    async (name: string, password: string) => {
      const res = await authApi.login(name, password)
      handleAuthSuccess(res)
    },
    [handleAuthSuccess],
  )

  const register = useCallback(
    async (name: string, password: string) => {
      const res = await authApi.register(name, password)
      handleAuthSuccess(res)
    },
    [handleAuthSuccess],
  )

  const logout = useCallback(async () => {
    const current = tokenRef.current
    if (current) {
      // On tente le logout côté serveur ; même si ça échoue (réseau, 401),
      // on continue le logout local pour ne pas bloquer l'utilisateur.
      try {
        await authApi.logout(current)
      } catch {
        /* best-effort */
      }
    }
    tokenRef.current = null
    writeStoredToken(null)
    setToken(null)
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (patch: ProfilePatch) => {
    const current = tokenRef.current
    if (!current) throw new Error('Non connecté.')
    const res = await authApi.updateProfile(current, patch)
    setUser(res.user)
  }, [])

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const current = tokenRef.current
      if (!current) throw new Error('Non connecté.')
      await authApi.changePassword(current, currentPassword, newPassword)
    },
    [],
  )

  const deleteAccount = useCallback(async (password: string) => {
    const current = tokenRef.current
    if (!current) throw new Error('Non connecté.')
    await authApi.deleteAccount(current, password)
    tokenRef.current = null
    writeStoredToken(null)
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      bootstrapping,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      deleteAccount,
    }),
    [
      token,
      user,
      bootstrapping,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      deleteAccount,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Écran de connexion/inscription. Calqué sur l'expérience MyMemory :
 *  - une seule vue, segment toggle Connexion/Inscription,
 *  - 2 champs (nom + mot de passe),
 *  - bouton plein brand, message d'erreur sous le formulaire.
 */
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

type Mode = 'login' | 'register'

export function AuthScreen() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') await login(name, password)
      else await register(name, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-slate-50 dark:bg-slate-950">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2" aria-hidden>
          ⚡
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          MyElec
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Connectez-vous pour accéder à votre installation.
        </p>
      </div>

      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
        {/* Segment toggle */}
        <div
          role="tablist"
          className="flex p-1 mb-5 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-medium"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => {
              setMode('login')
              setError(null)
            }}
            className={
              'flex-1 py-2 rounded-full transition-colors ' +
              (mode === 'login'
                ? 'bg-white dark:bg-slate-950 shadow text-slate-900 dark:text-slate-100'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700')
            }
          >
            Connexion
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            onClick={() => {
              setMode('register')
              setError(null)
            }}
            className={
              'flex-1 py-2 rounded-full transition-colors ' +
              (mode === 'register'
                ? 'bg-white dark:bg-slate-950 shadow text-slate-900 dark:text-slate-100'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700')
            }
          >
            Inscription
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="auth-name"
              className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Nom
            </label>
            <input
              id="auth-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre nom"
              autoComplete="username"
              autoCapitalize="words"
              required
              minLength={2}
              maxLength={40}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-[--brand] focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-[--brand]/30 outline-none transition text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Mot de passe
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? '6 caractères min.' : '••••••••'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
              minLength={6}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-[--brand] focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-[--brand]/30 outline-none transition text-slate-900 dark:text-slate-100"
            />
            {mode === 'register' && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                6 caractères minimum.
              </p>
            )}
          </div>

          {error && (
            <div className="text-sm rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-[--brand] text-white font-semibold py-2.5 shadow-md hover:brightness-110 active:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {busy
              ? mode === 'login'
                ? 'Connexion…'
                : 'Création…'
              : mode === 'login'
                ? 'Se connecter'
                : 'Créer mon compte'}
          </button>
        </form>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-6">
        Vos données restent sur votre serveur.
      </p>
    </div>
  )
}

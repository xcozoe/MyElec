/**
 * Édition du profil utilisateur, rendue dans un SidePanel.
 *
 * Calqué sur la fiche profil de MyMemory : avatar (photo + 26 emojis presets +
 * retrait), nom/email, swatches de thème (save instantané), changement de mot
 * de passe (collapsible), zone de danger (suppression de compte), logout.
 */
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth, type ProfilePatch } from '../context/AuthContext'
import { fileToAvatarDataUrl } from '../utils/avatar'
import { Avatar } from './Avatar'
import { DEFAULT_BRAND, ThemeSwatches } from './ThemeSwatches'

// 26 emojis presets : faune, objets, expressions courantes.
const AVATAR_PRESETS = [
  '😀','😎','🥸','🤓','🤖','👻','🐱','🐶','🐼','🦊',
  '🐯','🦁','🦄','🐧','🐸','🐝','🦋','🌟','⚡','🔧',
  '💡','🏠','🌿','🍀','🎨','🚀',
]

type FieldErrors = Partial<{ name: string; email: string; password: string; delete: string }>

interface ProfileSheetProps {
  onClose: () => void
}

export function ProfileSheet({ onClose }: ProfileSheetProps) {
  const { user, updateProfile, changePassword, deleteAccount, logout } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoOk, setInfoOk] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  // Mot de passe
  const [showPw, setShowPw] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwOk, setPwOk] = useState(false)

  // Suppression
  const [showDelete, setShowDelete] = useState(false)
  const [deletePw, setDeletePw] = useState('')
  const [deleting, setDeleting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Sélecteur d'avatar (import photo + emojis) masqué par défaut : il ne
  // s'ouvre qu'au clic sur « Changer la photo » pour ne pas encombrer la fiche.
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  if (!user) return null

  const flashOk = (setter: (b: boolean) => void) => {
    setter(true)
    window.setTimeout(() => setter(false), 1800)
  }

  const patch = async (next: ProfilePatch) => {
    try {
      await updateProfile(next)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue.'
      // Affecte l'erreur au bon champ si possible.
      if (next.avatar !== undefined) setErrors((e) => ({ ...e, name: message }))
      else setErrors((e) => ({ ...e, name: message }))
      return false
    }
  }

  const onSaveInfo = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})
    setSavingInfo(true)
    try {
      await updateProfile({ name: name.trim(), email: email.trim() })
      flashOk(setInfoOk)
    } catch (err) {
      setErrors({ name: err instanceof Error ? err.message : 'Erreur inconnue.' })
    } finally {
      setSavingInfo(false)
    }
  }

  const onPickFile = () => fileInputRef.current?.click()

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permet de re-sélectionner le même fichier
    if (!file) return
    try {
      // Redimensionne en carré 256×256 JPEG 0.85 — sinon une photo de
      // téléphone (~3 Mo) explose la limite serveur (300 Ko).
      const data = await fileToAvatarDataUrl(file)
      await patch({ avatar: data })
      setShowAvatarPicker(false)
    } catch (err) {
      setErrors({
        name: err instanceof Error ? err.message : 'Impossible de lire le fichier.',
      })
    }
  }

  const onPresetClick = async (emoji: string) => {
    await patch({ avatar: emoji })
    setShowAvatarPicker(false)
  }

  const onRemoveAvatar = async () => {
    await patch({ avatar: '' })
  }

  const onThemeChange = async (hex: string) => {
    await patch({ themeColor: hex })
  }

  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setErrors((e) => ({ ...e, password: undefined }))
    setSavingPw(true)
    try {
      await changePassword(currentPw, newPw)
      setCurrentPw('')
      setNewPw('')
      flashOk(setPwOk)
    } catch (err) {
      setErrors((e) => ({
        ...e,
        password: err instanceof Error ? err.message : 'Erreur inconnue.',
      }))
    } finally {
      setSavingPw(false)
    }
  }

  const onDelete = async (e: FormEvent) => {
    e.preventDefault()
    setErrors((e) => ({ ...e, delete: undefined }))
    setDeleting(true)
    try {
      await deleteAccount(deletePw)
      // deleteAccount déconnecte localement → l'AuthProvider va re-render
      // l'écran d'auth ; pas besoin d'appeler onClose ici.
    } catch (err) {
      setErrors((e) => ({
        ...e,
        delete: err instanceof Error ? err.message : 'Erreur inconnue.',
      }))
      setDeleting(false)
    }
  }

  const onLogout = async () => {
    await logout()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Mon profil</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Fermer
        </button>
      </div>

      {/* ===== Avatar ===== */}
      <section className="space-y-3">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} avatar={user.avatar} size={76} />
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setShowAvatarPicker((v) => !v)}
              aria-expanded={showAvatarPicker}
              className="block text-sm rounded-full px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
            >
              📷 Changer la photo
            </button>
            {user.avatar && (
              <button
                type="button"
                onClick={onRemoveAvatar}
                className="block text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Retirer la photo
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        {showAvatarPicker && (
          <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3">
            <button
              type="button"
              onClick={onPickFile}
              className="w-full text-sm rounded-lg px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              📷 Importer une photo…
            </button>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Ou choisissez un avatar
              </p>
              <div className="grid grid-cols-6 gap-1.5">
                {AVATAR_PRESETS.map((emoji) => {
                  const selected = user.avatar === emoji
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => onPresetClick(emoji)}
                      className={
                        'aspect-square text-2xl rounded-lg flex items-center justify-center transition ' +
                        (selected
                          ? 'bg-(--brand)/15 ring-2 ring-(--brand)'
                          : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700')
                      }
                      aria-pressed={selected}
                      aria-label={`Avatar ${emoji}`}
                    >
                      {emoji}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ===== Identité ===== */}
      <form onSubmit={onSaveInfo} className="space-y-3">
        <div>
          <label
            htmlFor="profile-name"
            className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Nom
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={40}
            required
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-(--brand) focus:bg-white dark:focus:bg-slate-950 outline-none transition"
          />
        </div>
        <div>
          <label
            htmlFor="profile-email"
            className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            E-mail <span className="text-slate-400 font-normal">(facultatif)</span>
          </label>
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ex. moi@exemple.fr"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-(--brand) focus:bg-white dark:focus:bg-slate-950 outline-none transition"
          />
        </div>

        {errors.name && (
          <p className="text-sm rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-3 py-2">
            {errors.name}
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={savingInfo}
            className="rounded-full bg-(--brand) text-white text-sm font-semibold px-4 py-2 shadow-sm hover:brightness-110 disabled:opacity-60 transition"
          >
            {savingInfo ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {infoOk && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">
              ✓ Enregistré
            </span>
          )}
        </div>
      </form>

      {/* ===== Thème ===== */}
      <section className="space-y-2">
        <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
          Couleur de thème
        </p>
        <ThemeSwatches
          value={user.themeColor || DEFAULT_BRAND}
          onChange={onThemeChange}
        />
      </section>

      {/* ===== Mot de passe (collapsible) ===== */}
      <section className="border-t border-slate-200 dark:border-slate-800 pt-5">
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          className="w-full text-left text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between hover:text-slate-900 dark:hover:text-slate-100"
        >
          Changer le mot de passe
          <span aria-hidden>{showPw ? '▴' : '▾'}</span>
        </button>
        {showPw && (
          <form onSubmit={onChangePassword} className="space-y-3 mt-3">
            <div>
              <label
                htmlFor="profile-cur"
                className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Mot de passe actuel
              </label>
              <input
                id="profile-cur"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-(--brand) focus:bg-white dark:focus:bg-slate-950 outline-none transition"
              />
            </div>
            <div>
              <label
                htmlFor="profile-new"
                className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Nouveau mot de passe
              </label>
              <input
                id="profile-new"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-(--brand) focus:bg-white dark:focus:bg-slate-950 outline-none transition"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                6 caractères minimum.
              </p>
            </div>
            {errors.password && (
              <p className="text-sm rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-3 py-2">
                {errors.password}
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={savingPw}
                className="rounded-full bg-(--brand) text-white text-sm font-semibold px-4 py-2 shadow-sm hover:brightness-110 disabled:opacity-60 transition"
              >
                {savingPw ? 'Enregistrement…' : 'Changer le mot de passe'}
              </button>
              {pwOk && (
                <span className="text-sm text-emerald-600 dark:text-emerald-400">
                  ✓ Modifié
                </span>
              )}
            </div>
          </form>
        )}
      </section>

      {/* ===== Zone de danger ===== */}
      <section className="border-t border-rose-200 dark:border-rose-900/60 pt-5">
        <h3 className="text-[11px] uppercase tracking-wider font-bold text-rose-600 dark:text-rose-400 mb-3">
          Zone de danger
        </h3>
        {!showDelete ? (
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            className="w-full rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-sm font-semibold py-2.5 hover:bg-rose-100 dark:hover:bg-rose-950 transition"
          >
            Supprimer mon compte
          </button>
        ) : (
          <form onSubmit={onDelete} className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Cette action est définitive. Vos données partagées (tableaux,
              lignes, équipements) ne sont pas supprimées, mais votre compte le sera.
            </p>
            <div>
              <label
                htmlFor="profile-del"
                className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Confirmez avec votre mot de passe
              </label>
              <input
                id="profile-del"
                type="password"
                value={deletePw}
                onChange={(e) => setDeletePw(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-rose-500 outline-none transition"
              />
            </div>
            {errors.delete && (
              <p className="text-sm rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-3 py-2">
                {errors.delete}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDelete(false)
                  setDeletePw('')
                  setErrors((e) => ({ ...e, delete: undefined }))
                }}
                className="flex-1 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-semibold py-2.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={deleting}
                className="flex-1 rounded-full bg-rose-600 text-white text-sm font-semibold py-2.5 shadow-sm hover:bg-rose-700 disabled:opacity-60 transition"
              >
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ===== Logout ===== */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-semibold py-2.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}

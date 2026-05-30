/**
 * Administration des accès (réservé aux comptes admin).
 *  - Demandes en attente : activer (autoriser) ou refuser (supprimer).
 *  - Comptes actifs : activer/désactiver, promouvoir/rétrograder admin, supprimer.
 *  - Création directe d'un compte (actif immédiatement).
 * Toutes les opérations passent par /api/admin/* (protégé côté serveur).
 */
import { useCallback, useEffect, useState } from 'react'
import { authApi, type AdminUser } from '../services/auth'
import { useAuth } from '../context/AuthContext'
import { useConfirm, useNotify } from './Dialogs'

export function AdminUsers() {
  const { token, user } = useAuth()
  const confirmDialog = useConfirm()
  const notify = useNotify()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newAdmin, setNewAdmin] = useState(false)
  const [creating, setCreating] = useState(false)

  const reload = useCallback(async () => {
    if (!token) return
    try {
      const res = await authApi.adminListUsers(token)
      setUsers(res.users)
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setLoading(false)
    }
  }, [token, notify])

  useEffect(() => {
    void reload()
  }, [reload])

  const run = async (id: string, op: () => Promise<unknown>, okMsg: string) => {
    if (!token) return
    setBusyId(id)
    try {
      await op()
      notify(okMsg)
      await reload()
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (newName.trim().length < 2) return notify('Nom trop court.', 'error')
    if (newPassword.length < 6)
      return notify('Mot de passe : 6 caractères minimum.', 'error')
    setCreating(true)
    try {
      await authApi.adminCreateUser(token, newName.trim(), newPassword, newAdmin)
      notify(`Compte « ${newName.trim()} » créé.`)
      setNewName('')
      setNewPassword('')
      setNewAdmin(false)
      await reload()
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setCreating(false)
    }
  }

  const pending = users.filter((u) => !u.active)
  const actives = users.filter((u) => u.active)

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-3">
        Gestion des accès
      </h2>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
      ) : (
        <div className="space-y-6">
          {/* Demandes en attente */}
          <div>
            <h3 className="text-sm font-medium mb-2">
              Demandes en attente
              {pending.length > 0 && (
                <span className="ml-2 text-xs font-normal rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5">
                  {pending.length}
                </span>
              )}
            </h3>
            {pending.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                Aucune demande en attente.
              </p>
            ) : (
              <ul className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                {pending.map((u) => (
                  <li key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{u.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Demande du {formatDate(u.createdAt)}
                      </div>
                    </div>
                    <button
                      disabled={busyId === u.id}
                      onClick={() =>
                        run(
                          u.id,
                          () => authApi.adminUpdateUser(token!, u.id, { active: true }),
                          `${u.name} a désormais accès.`,
                        )
                      }
                      className="text-xs rounded-md bg-emerald-600 text-white px-2.5 py-1 hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Autoriser
                    </button>
                    <button
                      disabled={busyId === u.id}
                      onClick={async () => {
                        if (
                          !(await confirmDialog({
                            title: `Refuser la demande de ${u.name} ?`,
                            message: 'Le compte sera supprimé.',
                            confirmLabel: 'Refuser',
                            danger: true,
                          }))
                        )
                          return
                        await run(
                          u.id,
                          () => authApi.adminDeleteUser(token!, u.id),
                          `Demande de ${u.name} refusée.`,
                        )
                      }}
                      className="text-xs rounded-md border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 px-2.5 py-1 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                    >
                      Refuser
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Comptes actifs */}
          <div>
            <h3 className="text-sm font-medium mb-2">Comptes</h3>
            <ul className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
              {actives.map((u) => {
                const isSelf = u.id === user?.id
                return (
                  <li key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {u.name}
                        {isSelf && (
                          <span className="ml-1 text-xs text-slate-400">(vous)</span>
                        )}
                        {u.isAdmin && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5">
                            admin
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      disabled={busyId === u.id}
                      onClick={() =>
                        run(
                          u.id,
                          () =>
                            authApi.adminUpdateUser(token!, u.id, { isAdmin: !u.isAdmin }),
                          u.isAdmin
                            ? `${u.name} n'est plus administrateur.`
                            : `${u.name} est administrateur.`,
                        )
                      }
                      className="text-xs rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                    >
                      {u.isAdmin ? 'Retirer admin' : 'Rendre admin'}
                    </button>
                    {!isSelf && (
                      <button
                        disabled={busyId === u.id}
                        onClick={() =>
                          run(
                            u.id,
                            () =>
                              authApi.adminUpdateUser(token!, u.id, { active: false }),
                            `${u.name} désactivé.`,
                          )
                        }
                        className="text-xs rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                      >
                        Désactiver
                      </button>
                    )}
                    {!isSelf && (
                      <button
                        disabled={busyId === u.id}
                        onClick={async () => {
                          if (
                            !(await confirmDialog({
                              title: `Supprimer le compte ${u.name} ?`,
                              message:
                                'Son accès est révoqué immédiatement. Les données partagées ne sont pas supprimées.',
                              confirmLabel: 'Supprimer',
                              danger: true,
                            }))
                          )
                            return
                          await run(
                            u.id,
                            () => authApi.adminDeleteUser(token!, u.id),
                            `Compte ${u.name} supprimé.`,
                          )
                        }}
                        className="text-xs rounded-md border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 px-2.5 py-1 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                      >
                        Supprimer
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Création directe */}
          <div>
            <h3 className="text-sm font-medium mb-2">Créer un compte</h3>
            <form
              onSubmit={create}
              className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nom"
                  autoComplete="off"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mot de passe (6 car. min.)"
                  autoComplete="new-password"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={newAdmin}
                    onChange={(e) => setNewAdmin(e.target.checked)}
                  />
                  Administrateur
                </label>
                <button
                  type="submit"
                  disabled={creating}
                  className="text-sm rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-1.5 disabled:opacity-50"
                >
                  {creating ? 'Création…' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

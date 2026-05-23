import { useEffect, useState } from 'react'
import { PHASES, type Phase, type Rangee, type Tableau } from '../types/electrical'

export function RangeeEditor({
  mode,
  tableau,
  initial,
  onSave,
  onDelete,
  onCancel,
}: {
  mode: 'create' | 'edit'
  tableau: Tableau
  initial: Rangee
  onSave: (next: Rangee, description?: string) => Promise<void> | void
  onDelete?: () => Promise<void> | void
  onCancel: () => void
}) {
  const [r, setR] = useState<Rangee>(initial)
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setR(initial)
    setDescription('')
    setError(null)
  }, [initial])

  const conflictId =
    mode === 'create' && tableau.rangees.some((x) => x.id === r.id)

  const handleSave = async () => {
    setError(null)
    if (!r.id.trim()) return setError('ID requis.')
    if (conflictId) return setError('Cet ID existe déjà.')
    try {
      await onSave(r, description.trim() || undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {mode === 'create' ? 'Nouvelle rangée' : 'Éditer la rangée'}
        </h3>
        <button
          onClick={onCancel}
          className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5"
        >
          Fermer
        </button>
      </div>

      <Field label="ID">
        <input
          type="text"
          value={r.id}
          disabled={mode === 'edit'}
          onChange={(e) => setR({ ...r, id: e.target.value })}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-mono"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Numéro">
          <input
            type="number"
            min={1}
            value={r.numero}
            onChange={(e) => setR({ ...r, numero: Number(e.target.value) })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          />
        </Field>
        <Field label="Phase">
          <select
            value={r.phase}
            onChange={(e) => setR({ ...r, phase: e.target.value as Phase })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            {PHASES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Libellé">
        <input
          type="text"
          value={r.libelle}
          onChange={(e) => setR({ ...r, libelle: e.target.value })}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
      </Field>

      <Field label="Différentiel de tête (ID)" hint="Identifiant du disjoncteur en tête de rangée">
        <input
          type="text"
          value={r.differentiel_id ?? ''}
          onChange={(e) =>
            setR({ ...r, differentiel_id: e.target.value || undefined })
          }
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-mono"
        />
      </Field>

      <Field label="Notes">
        <textarea
          value={r.notes ?? ''}
          onChange={(e) => setR({ ...r, notes: e.target.value || undefined })}
          rows={3}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
      </Field>

      <Field label="Description de la modification">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
      </Field>

      {error && <div className="text-sm text-red-700 dark:text-red-300">{error}</div>}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={handleSave}
          className="rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-1.5 text-sm"
        >
          {mode === 'create' ? 'Créer' : 'Enregistrer'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-slate-300 dark:border-slate-700 px-4 py-1.5 text-sm"
        >
          Annuler
        </button>
        {mode === 'edit' && onDelete && (
          <button
            onClick={async () => {
              const hasDisjoncteurs = initial.disjoncteurs.length > 0
              const message = hasDisjoncteurs
                ? `Cette rangée contient ${initial.disjoncteurs.length} disjoncteur(s). Supprimer quand même ?`
                : `Supprimer la rangée ${initial.id} ?`
              if (confirm(message)) await onDelete()
            }}
            className="ml-auto rounded-md border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-1.5 text-sm"
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint && (
        <span className="block mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      )}
    </label>
  )
}

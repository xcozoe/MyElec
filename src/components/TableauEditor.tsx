import { useEffect, useState } from 'react'
import type { Tableau } from '../types/electrical'

export function TableauEditor({
  initial,
  allTableaux,
  onSave,
  onDelete,
  onCancel,
}: {
  initial: Tableau
  allTableaux: Tableau[]
  onSave: (next: Tableau, description?: string) => Promise<void> | void
  onDelete?: () => Promise<void> | void
  onCancel: () => void
}) {
  const [t, setT] = useState<Tableau>(initial)
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setT(initial)
    setDescription('')
    setError(null)
  }, [initial])

  const candidatsParent = allTableaux.filter((x) => x.id !== t.id)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Éditer le tableau</h3>

      <Field label="Nom">
        <input
          type="text"
          value={t.nom}
          onChange={(e) => setT({ ...t, nom: e.target.value })}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
      </Field>

      <Field label="Emplacement">
        <input
          type="text"
          value={t.emplacement}
          onChange={(e) => setT({ ...t, emplacement: e.target.value })}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Alimentation">
          <select
            value={t.alimentation}
            onChange={(e) =>
              setT({
                ...t,
                alimentation: e.target.value as 'triphase' | 'monophase',
              })
            }
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            <option value="triphase">Triphasé</option>
            <option value="monophase">Monophasé</option>
          </select>
        </Field>
        <Field label="Phase arrivée (si mono)">
          <select
            value={t.arrivee_phases ?? 'TRI'}
            onChange={(e) =>
              setT({
                ...t,
                arrivee_phases: e.target.value as 'TRI' | 'L1' | 'L2' | 'L3',
              })
            }
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            <option value="TRI">TRI</option>
            <option value="L1">L1</option>
            <option value="L2">L2</option>
            <option value="L3">L3</option>
          </select>
        </Field>
      </div>

      <Field label="Tableau parent (cascade)">
        <select
          value={t.parent_tableau_id ?? ''}
          onChange={(e) =>
            setT({
              ...t,
              parent_tableau_id: e.target.value || undefined,
            })
          }
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        >
          <option value="">— Aucun —</option>
          {candidatsParent.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Disjoncteur d'arrivée (ID dans le tableau parent)">
        <input
          type="text"
          value={t.parent_disjoncteur_id ?? ''}
          onChange={(e) =>
            setT({
              ...t,
              parent_disjoncteur_id: e.target.value || undefined,
            })
          }
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-mono"
        />
      </Field>

      <Field label="Notes">
        <textarea
          value={t.notes ?? ''}
          onChange={(e) => setT({ ...t, notes: e.target.value || undefined })}
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
          onClick={async () => {
            setError(null)
            try {
              await onSave(t, description.trim() || undefined)
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e))
            }
          }}
          className="rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-1.5 text-sm"
        >
          Enregistrer
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-slate-300 dark:border-slate-700 px-4 py-1.5 text-sm"
        >
          Annuler
        </button>
        {onDelete && (
          <button
            onClick={async () => {
              const nbRangees = initial.rangees.length
              const message =
                nbRangees > 0
                  ? `Ce tableau contient ${nbRangees} rangée(s). Supprimer quand même ?`
                  : `Supprimer le tableau ${initial.nom} ?`
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

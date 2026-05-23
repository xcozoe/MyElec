import { useEffect, useMemo, useState } from 'react'
import {
  PHASES,
  POLES,
  STATUTS,
  TYPES_PROTECTION,
  type Disjoncteur,
  type Phase,
  type Poles,
  type StatutDisjoncteur,
  type Tableau,
  type TypeProtection,
} from '../types/electrical'

const SUGGESTIONS_CALIBRE = ['C2', 'C10', 'C16', 'C20', 'C32', '40 A 30 mA Type AC', '63 A 30 mA Type A']

export interface DisjoncteurEditorProps {
  mode: 'create' | 'edit'
  tableau: Tableau
  rangeeId: string
  initial: Disjoncteur
  onSave: (next: Disjoncteur, description?: string) => Promise<void> | void
  onDelete?: () => Promise<void> | void
  onCancel: () => void
}

export function DisjoncteurEditor({
  mode,
  tableau,
  rangeeId,
  initial,
  onSave,
  onDelete,
  onCancel,
}: DisjoncteurEditorProps) {
  const [d, setD] = useState<Disjoncteur>(initial)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setD(initial)
    setDescription('')
    setError(null)
  }, [initial])

  const differentielsDisponibles = useMemo(() => {
    const all: { id: string; label: string }[] = []
    for (const r of tableau.rangees) {
      for (const dj of r.disjoncteurs) {
        if (
          dj.type_protection === 'differentiel_tete_rangee' ||
          dj.type_protection === 'differentiel_tete_tableau' ||
          dj.type_protection === 'differentiel_dedie' ||
          dj.type_protection === 'disjoncteur_diff_dedie'
        ) {
          if (dj.id !== d.id) {
            all.push({ id: dj.id, label: `${dj.id} — ${dj.etiquette}` })
          }
        }
      }
    }
    return all
  }, [tableau, d.id])

  const isCreateInvalidId =
    mode === 'create' &&
    tableau.rangees.some((r) => r.disjoncteurs.some((dj) => dj.id === d.id))

  const handleSave = async () => {
    setError(null)
    if (!d.id.trim()) return setError('ID requis.')
    if (isCreateInvalidId) return setError('Cet ID existe déjà dans ce tableau.')
    if (!d.etiquette.trim()) return setError('Étiquette requise.')
    setSaving(true)
    try {
      await onSave(d, description.trim() || undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const rangee = tableau.rangees.find((r) => r.id === rangeeId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {mode === 'create' ? 'Nouveau disjoncteur' : 'Éditer le disjoncteur'}
          </h3>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {tableau.nom} · {rangee?.libelle ?? rangeeId}
          </div>
        </div>
        <button
          onClick={onCancel}
          className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Fermer
        </button>
      </div>

      <Field label="ID" hint="Convention : [code-tableau]-[code-rangée]-[code-départ]">
        <input
          type="text"
          value={d.id}
          disabled={mode === 'edit'}
          onChange={(e) => setD({ ...d, id: e.target.value })}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-mono"
        />
      </Field>

      <Field label="Position dans la rangée">
        <input
          type="number"
          min={1}
          value={d.position}
          onChange={(e) => setD({ ...d, position: Number(e.target.value) })}
          className="w-24 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
      </Field>

      <Field label="Étiquette">
        <input
          type="text"
          value={d.etiquette}
          onChange={(e) => setD({ ...d, etiquette: e.target.value })}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Type de protection">
          <select
            value={d.type_protection}
            onChange={(e) =>
              setD({ ...d, type_protection: e.target.value as TypeProtection })
            }
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            {TYPES_PROTECTION.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Calibre" hint="C2, C10, C16, C20, C32… ou texte libre">
          <input
            list="calibres"
            type="text"
            value={d.calibre}
            onChange={(e) => setD({ ...d, calibre: e.target.value })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          />
          <datalist id="calibres">
            {SUGGESTIONS_CALIBRE.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>

        <Field label="Pôles">
          <select
            value={d.poles}
            onChange={(e) => setD({ ...d, poles: e.target.value as Poles })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            {POLES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Phase d'affectation">
          <select
            value={d.phase_affectation}
            onChange={(e) =>
              setD({ ...d, phase_affectation: e.target.value as Phase })
            }
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            {PHASES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Statut">
          <select
            value={d.statut}
            onChange={(e) =>
              setD({ ...d, statut: e.target.value as StatutDisjoncteur })
            }
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            {STATUTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Différentiel parent" hint="Disponible : différentiels du même tableau">
          <select
            value={d.differentiel_parent_id ?? ''}
            onChange={(e) =>
              setD({
                ...d,
                differentiel_parent_id: e.target.value || undefined,
              })
            }
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            <option value="">— Aucun —</option>
            {differentielsDisponibles.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Appareil piloté (contacteurs, télérupteurs, horloges)">
        <input
          type="text"
          value={d.appareil_pilote ?? ''}
          onChange={(e) =>
            setD({ ...d, appareil_pilote: e.target.value || undefined })
          }
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
      </Field>

      <Field label="Notes">
        <textarea
          value={d.notes ?? ''}
          onChange={(e) =>
            setD({ ...d, notes: e.target.value || undefined })
          }
          rows={3}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
      </Field>

      <Field
        label="Description de la modification"
        hint="Texte libre — apparaîtra dans l'historique."
      >
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            mode === 'create'
              ? 'ex : Création du disjoncteur après test physique.'
              : 'ex : Identifié comme alimentant le frigo après coupure.'
          }
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
      </Field>

      {error && (
        <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <button
          disabled={saving}
          onClick={handleSave}
          className="rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-1.5 text-sm disabled:opacity-50"
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
              if (
                confirm(
                  `Supprimer définitivement le disjoncteur ${d.id} ? Son historique passé sera conservé.`,
                )
              ) {
                await onDelete()
              }
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

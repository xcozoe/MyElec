import { useEffect, useMemo, useState } from 'react'
import { PhotoField } from './PhotoField'
import { Field } from './Field'
import { useConfirm } from './Dialogs'
import { useEditorGuard } from './useEditorGuard'
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
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const confirmDialog = useConfirm()
  const handleClose = useEditorGuard(t, initial, onCancel)

  useEffect(() => {
    setT(initial)
    setError(null)
  }, [initial])

  const candidatsParent = allTableaux.filter((x) => x.id !== t.id)

  // Disjoncteurs du tableau parent sélectionné — pour choisir le départ
  // d'arrivée parmi des IDs réels plutôt qu'en saisie libre.
  const parentDisjoncteurs = useMemo(() => {
    if (!t.parent_tableau_id) return []
    const parent = allTableaux.find((x) => x.id === t.parent_tableau_id)
    if (!parent) return []
    return parent.rangees
      .flatMap((r) => r.disjoncteurs)
      .map((d) => ({ id: d.id, label: `${d.id} — ${d.etiquette}` }))
  }, [allTableaux, t.parent_tableau_id])

  const handleSave = async () => {
    setError(null)
    // En triphasé, `arrivee_phases` n'a pas de sens (on prend les 3 phases) :
    // on le neutralise pour éviter des données incohérentes (ex : tri + L2).
    const cleaned: Tableau =
      t.alimentation === 'triphase' ? { ...t, arrivee_phases: undefined } : t
    setSaving(true)
    try {
      await onSave(cleaned, undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Éditer le tableau</h3>
        <button
          onClick={handleClose}
          className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5"
        >
          Fermer
        </button>
      </div>

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
            onChange={(e) => {
              const alimentation = e.target.value as 'triphase' | 'monophase'
              setT({
                ...t,
                alimentation,
                // Tri : pas de phase d'arrivée. Mono : défaut L1 si non défini.
                arrivee_phases:
                  alimentation === 'triphase'
                    ? undefined
                    : (t.arrivee_phases && t.arrivee_phases !== 'TRI'
                        ? t.arrivee_phases
                        : 'L1'),
              })
            }}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            <option value="triphase">Triphasé</option>
            <option value="monophase">Monophasé</option>
          </select>
        </Field>
        {t.alimentation === 'monophase' && (
          <Field label="Phase d'arrivée">
            <select
              value={t.arrivee_phases && t.arrivee_phases !== 'TRI' ? t.arrivee_phases : 'L1'}
              onChange={(e) =>
                setT({
                  ...t,
                  arrivee_phases: e.target.value as 'L1' | 'L2' | 'L3',
                })
              }
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
            >
              <option value="L1">L1</option>
              <option value="L2">L2</option>
              <option value="L3">L3</option>
            </select>
          </Field>
        )}
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

      <Field
        label="Disjoncteur d'arrivée (dans le tableau parent)"
        hint={
          !t.parent_tableau_id
            ? 'Sélectionnez d\'abord un tableau parent.'
            : parentDisjoncteurs.length === 0
              ? 'Le tableau parent n\'a aucun disjoncteur enregistré.'
              : undefined
        }
      >
        <select
          value={t.parent_disjoncteur_id ?? ''}
          disabled={!t.parent_tableau_id}
          onChange={(e) =>
            setT({
              ...t,
              parent_disjoncteur_id: e.target.value || undefined,
            })
          }
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-mono disabled:opacity-50"
        >
          <option value="">— Aucun —</option>
          {parentDisjoncteurs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
          {/* Conserve la valeur courante si elle n'est plus dans le parent. */}
          {t.parent_disjoncteur_id &&
            !parentDisjoncteurs.some((d) => d.id === t.parent_disjoncteur_id) && (
              <option value={t.parent_disjoncteur_id}>
                {t.parent_disjoncteur_id} (introuvable)
              </option>
            )}
        </select>
      </Field>

      <PhotoField
        value={t.photo_url}
        onChange={(url) => setT({ ...t, photo_url: url })}
        alt={`${t.nom} — coffret`}
        hint="URL d'image du coffret (ex : /sources/coffret-merlin-gerin-2-rangees.png)."
      />

      <Field label="Notes">
        <textarea
          value={t.notes ?? ''}
          onChange={(e) => setT({ ...t, notes: e.target.value || undefined })}
          rows={3}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
      </Field>

      {error && <div className="text-sm text-red-700 dark:text-red-300">{error}</div>}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <button
          disabled={saving}
          onClick={handleSave}
          className="rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-1.5 text-sm disabled:opacity-50"
        >
          Enregistrer
        </button>
        <button
          onClick={handleClose}
          className="rounded-md border border-slate-300 dark:border-slate-700 px-4 py-1.5 text-sm"
        >
          Annuler
        </button>
        {onDelete && (
          <button
            disabled={saving}
            onClick={async () => {
              const nbRangees = initial.rangees.length
              if (
                !(await confirmDialog({
                  title: `Supprimer le tableau ${initial.nom} ?`,
                  message:
                    nbRangees > 0
                      ? `Ce tableau contient ${nbRangees} rangée(s).`
                      : undefined,
                  confirmLabel: 'Supprimer',
                  danger: true,
                }))
              )
                return
              setSaving(true)
              try {
                await onDelete()
              } finally {
                setSaving(false)
              }
            }}
            className="ml-auto rounded-md border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-1.5 text-sm disabled:opacity-50"
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  )
}

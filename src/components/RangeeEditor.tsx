import { useEffect, useMemo, useState } from 'react'
import { PHASES, type Phase, type Rangee, type Tableau } from '../types/electrical'
import { toPositiveInt } from '../utils/form'
import { Field } from './Field'
import { Section } from './Section'
import { useConfirm } from './Dialogs'
import { useEditorGuard } from './useEditorGuard'

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
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const confirmDialog = useConfirm()
  const handleClose = useEditorGuard(r, initial, onCancel)

  useEffect(() => {
    setR(initial)
    setError(null)
  }, [initial])

  const conflictId =
    mode === 'create' && tableau.rangees.some((x) => x.id === r.id)

  // Différentiels existants du tableau (pour le picker de tête de rangée),
  // au lieu d'une saisie libre qui peut référencer un ID inexistant.
  const diffOptions = useMemo(() => {
    const opts: { id: string; label: string }[] = []
    for (const rg of tableau.rangees) {
      for (const dj of rg.disjoncteurs) {
        if (
          dj.type_protection === 'differentiel_tete_rangee' ||
          dj.type_protection === 'differentiel_tete_tableau' ||
          dj.type_protection === 'differentiel_dedie' ||
          dj.type_protection === 'disjoncteur_diff_dedie'
        ) {
          opts.push({ id: dj.id, label: `${dj.id} — ${dj.etiquette}` })
        }
      }
    }
    return opts
  }, [tableau])

  const handleSave = async () => {
    setError(null)
    if (!r.id.trim()) return setError('ID requis.')
    if (conflictId) return setError('Cet ID existe déjà.')
    if (!Number.isInteger(r.numero) || r.numero < 1)
      return setError('Numéro invalide — doit être un entier ≥ 1.')
    setSaving(true)
    try {
      await onSave(r, undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {mode === 'create' ? 'Nouvelle rangée' : 'Éditer la rangée'}
        </h3>
        <button
          onClick={handleClose}
          className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5"
        >
          Fermer
        </button>
      </div>

      <Section title="Identification">
        <Field label="ID">
          <input
            type="text"
            value={r.id}
            disabled={mode === 'edit'}
            onChange={(e) => setR({ ...r, id: e.target.value })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Numéro">
            <input
              type="number"
              min={1}
              value={r.numero}
              onChange={(e) => setR({ ...r, numero: toPositiveInt(e.target.value, r.numero) })}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Phase">
            <select
              value={r.phase}
              onChange={(e) => setR({ ...r, phase: e.target.value as Phase })}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
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
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </Field>
      </Section>

      <Section title="Définition">
        <Field label="Différentiel de tête" hint="Disjoncteur différentiel en tête de rangée (parmi ceux du tableau)">
          <select
            value={r.differentiel_id ?? ''}
            onChange={(e) =>
              setR({ ...r, differentiel_id: e.target.value || undefined })
            }
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
          >
            <option value="">— Aucun —</option>
            {diffOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
            {/* Conserve la valeur courante si elle ne correspond à aucun
                différentiel listé (donnée existante à ne pas perdre). */}
            {r.differentiel_id &&
              !diffOptions.some((o) => o.id === r.differentiel_id) && (
                <option value={r.differentiel_id}>
                  {r.differentiel_id} (introuvable dans le tableau)
                </option>
              )}
          </select>
        </Field>

        <Field label="Notes">
          <textarea
            value={r.notes ?? ''}
            onChange={(e) => setR({ ...r, notes: e.target.value || undefined })}
            rows={3}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </Field>
      </Section>

      {error && <div className="text-sm text-red-700 dark:text-red-300">{error}</div>}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <button
          disabled={saving}
          onClick={handleSave}
          className="rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-1.5 text-sm disabled:opacity-50"
        >
          {mode === 'create' ? 'Créer' : 'Enregistrer'}
        </button>
        <button
          onClick={handleClose}
          className="rounded-md border border-slate-300 dark:border-slate-700 px-4 py-1.5 text-sm"
        >
          Annuler
        </button>
        {mode === 'edit' && onDelete && (
          <button
            disabled={saving}
            onClick={async () => {
              const hasDisjoncteurs = initial.disjoncteurs.length > 0
              if (
                !(await confirmDialog({
                  title: `Supprimer la rangée ${initial.id} ?`,
                  message: hasDisjoncteurs
                    ? `Cette rangée contient ${initial.disjoncteurs.length} disjoncteur(s).`
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

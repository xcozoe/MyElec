import { useEffect, useMemo, useState } from 'react'
import type { Disjoncteur, Ligne, Tableau } from '../types/electrical'
import { toOptionalNumber } from '../utils/form'
import { Field } from './Field'
import { Section } from './Section'
import { useConfirm } from './Dialogs'
import { useEditorGuard } from './useEditorGuard'

export interface DisjoncteurOption {
  tableauId: string
  tableauNom: string
  rangeeLibelle: string
  disjoncteur: Disjoncteur
}

export function buildDisjoncteurOptions(
  tableaux: Tableau[],
): DisjoncteurOption[] {
  const out: DisjoncteurOption[] = []
  for (const t of tableaux) {
    for (const r of t.rangees) {
      for (const d of r.disjoncteurs) {
        if (d.statut === 'desaffecte') continue
        out.push({
          tableauId: t.id,
          tableauNom: t.nom,
          rangeeLibelle: r.libelle,
          disjoncteur: d,
        })
      }
    }
  }
  return out
}

const SECTIONS = [1.5, 2.5, 4, 6, 10, 16]

export function LigneEditor({
  mode,
  initial,
  tableaux,
  allLignes,
  onSave,
  onDelete,
  onCancel,
}: {
  mode: 'create' | 'edit'
  initial: Ligne
  tableaux: Tableau[]
  allLignes: Ligne[]
  onSave: (
    next: Ligne,
    description?: string,
    options?: { thenNew?: boolean },
  ) => Promise<void> | void
  onDelete?: () => Promise<void> | void
  onCancel: () => void
}) {
  const [l, setL] = useState<Ligne>(initial)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const confirmDialog = useConfirm()
  const handleClose = useEditorGuard(l, initial, onCancel)

  useEffect(() => {
    setL(initial)
    setError(null)
  }, [initial])

  const djOptions = useMemo(
    () => buildDisjoncteurOptions(tableaux),
    [tableaux],
  )
  const groupedDj = useMemo(() => {
    const map = new Map<string, DisjoncteurOption[]>()
    for (const opt of djOptions) {
      const key = opt.tableauNom
      const arr = map.get(key) ?? []
      arr.push(opt)
      map.set(key, arr)
    }
    return [...map.entries()]
  }, [djOptions])

  const selectedDj = djOptions.find((o) => o.disjoncteur.id === l.disjoncteur_id)

  const handleSave = async (thenNew = false) => {
    setError(null)
    if (!l.id.trim() || !l.id.startsWith('L')) {
      return setError('ID requis, doit commencer par "L" (ex : L-PLAQUE).')
    }
    if (!l.libelle.trim()) return setError('Libellé requis.')
    if (!l.disjoncteur_id)
      return setError('Disjoncteur source requis.')
    if (allLignes.some((x) => x.id === l.id && x.id !== initial.id))
      return setError(`L'ID ${l.id} existe déjà.`)
    setSaving(true)
    try {
      await onSave(l, undefined, { thenNew })
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
          {mode === 'create' ? 'Nouvelle ligne électrique' : 'Éditer la ligne'}
        </h3>
        <button
          onClick={handleClose}
          className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5"
        >
          Fermer
        </button>
      </div>

      <Section title="Identification">
        <Field
          label="ID"
          hint={
            mode === 'edit'
              ? undefined
              : 'Format libre commençant par "L", ex : L-PLAQUE, L-PC-CUI-A'
          }
        >
          <input
            type="text"
            value={l.id}
            onChange={(e) => setL({ ...l, id: e.target.value.toUpperCase() })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
          />
        </Field>

        <Field label="Libellé">
          <input
            type="text"
            value={l.libelle}
            onChange={(e) => setL({ ...l, libelle: e.target.value })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Disjoncteur source">
          <select
            value={l.disjoncteur_id}
            onChange={(e) => setL({ ...l, disjoncteur_id: e.target.value })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
          >
            <option value="">— Choisir —</option>
            {groupedDj.map(([tableauNom, options]) => (
              <optgroup key={tableauNom} label={tableauNom}>
                {options.map((o) => (
                  <option key={o.disjoncteur.id} value={o.disjoncteur.id}>
                    {o.disjoncteur.id} — {o.disjoncteur.etiquette} ({o.disjoncteur.calibre})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {selectedDj && (
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {selectedDj.tableauNom} · {selectedDj.rangeeLibelle} ·{' '}
              phase {selectedDj.disjoncteur.phase_affectation} · {selectedDj.disjoncteur.calibre}
            </div>
          )}
        </Field>
      </Section>

      <Section title="Caractéristiques">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Section (mm²)">
            <input
              list="ligne-sections"
              type="number"
              min={0.5}
              step={0.5}
              value={l.section_mm2 ?? ''}
              onChange={(e) =>
                setL({ ...l, section_mm2: toOptionalNumber(e.target.value) })
              }
              className="w-28 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            />
            <datalist id="ligne-sections">
              {SECTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Longueur estimée (m)">
            <input
              type="number"
              min={0}
              step={0.5}
              value={l.longueur_estimee_m ?? ''}
              onChange={(e) =>
                setL({ ...l, longueur_estimee_m: toOptionalNumber(e.target.value) })
              }
              className="w-28 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <Field label="Parcours" hint="Texte libre décrivant le cheminement du câble">
          <textarea
            value={l.parcours ?? ''}
            onChange={(e) =>
              setL({ ...l, parcours: e.target.value || undefined })
            }
            rows={3}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Notes">
          <textarea
            value={l.notes ?? ''}
            onChange={(e) =>
              setL({ ...l, notes: e.target.value || undefined })
            }
            rows={2}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </Field>
      </Section>

      {error && <div className="text-sm text-red-700 dark:text-red-300">{error}</div>}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <button
          disabled={saving}
          onClick={() => handleSave(false)}
          className="rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-1.5 text-sm disabled:opacity-50"
        >
          {mode === 'create' ? 'Créer' : 'Enregistrer'}
        </button>
        {mode === 'create' && (
          <button
            disabled={saving}
            onClick={() => handleSave(true)}
            className="rounded-md border border-slate-400 dark:border-slate-600 px-4 py-1.5 text-sm disabled:opacity-50"
          >
            Créer et saisir une autre
          </button>
        )}
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
              if (
                !(await confirmDialog({
                  title: `Supprimer la ligne ${l.id} ?`,
                  message:
                    'Les end-points et appareils qui y sont rattachés deviendront orphelins.',
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

export function emptyLigne(): Ligne {
  return { id: 'L-', libelle: '', disjoncteur_id: '' }
}

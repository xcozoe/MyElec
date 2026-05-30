import { useEffect, useState } from 'react'
import {
  CATEGORIES_PIECE,
  NIVEAUX,
  type CategoriePiece,
  type Niveau,
  type Piece,
} from '../types/electrical'
import { toOptionalNumber } from '../utils/form'
import { Field } from './Field'
import { useConfirm } from './Dialogs'
import { useEditorGuard } from './useEditorGuard'

export function PieceEditor({
  mode,
  initial,
  allPieces,
  onSave,
  onDelete,
  onCancel,
}: {
  mode: 'create' | 'edit'
  initial: Piece
  allPieces: Piece[]
  onSave: (next: Piece, description?: string) => Promise<void> | void
  onDelete?: () => Promise<void> | void
  onCancel: () => void
}) {
  const [p, setP] = useState<Piece>(initial)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const confirmDialog = useConfirm()
  const handleClose = useEditorGuard(p, initial, onCancel)

  useEffect(() => {
    setP(initial)
    setError(null)
  }, [initial])

  const handleSave = async () => {
    setError(null)
    if (!p.id.trim()) return setError('ID requis.')
    if (!p.trigramme.trim() || p.trigramme.length > 4)
      return setError('Trigramme requis (1 à 4 caractères).')
    if (!p.nom.trim()) return setError('Nom requis.')
    if (allPieces.some((x) => x.id === p.id && x.id !== initial.id))
      return setError('Cet ID existe déjà.')
    // Unicité du trigramme vérifiée dans les DEUX modes (en édition aussi) :
    // le trigramme sert à générer les IDs des end-points/appareils/volets,
    // un doublon provoquerait des collisions d'identifiants.
    if (allPieces.some((x) => x.trigramme === p.trigramme && x.id !== p.id))
      return setError('Ce trigramme est déjà utilisé par une autre pièce.')
    setSaving(true)
    try {
      await onSave(p, undefined)
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
          {mode === 'create' ? 'Nouvelle pièce' : 'Éditer la pièce'}
        </h3>
        <button
          onClick={handleClose}
          className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5"
        >
          Fermer
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="ID" hint="Sert d'identifiant interne — souvent le trigramme.">
          <input
            type="text"
            value={p.id}
            disabled={mode === 'edit'}
            onChange={(e) => setP({ ...p, id: e.target.value })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-mono"
          />
        </Field>
        <Field label="Trigramme" hint="1 à 4 caractères utilisés dans les IDs (PC_CUI_…)">
          <input
            type="text"
            value={p.trigramme}
            onChange={(e) =>
              setP({ ...p, trigramme: e.target.value.toUpperCase() })
            }
            maxLength={4}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-mono uppercase"
          />
        </Field>
      </div>

      <Field label="Nom">
        <input
          type="text"
          value={p.nom}
          onChange={(e) => setP({ ...p, nom: e.target.value })}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Niveau">
          <select
            value={p.niveau}
            onChange={(e) => setP({ ...p, niveau: e.target.value as Niveau })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            {NIVEAUX.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Catégorie">
          <select
            value={p.categorie}
            onChange={(e) =>
              setP({ ...p, categorie: e.target.value as CategoriePiece })
            }
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            {CATEGORIES_PIECE.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Surface (m²) — optionnel">
        <input
          type="number"
          min={0}
          step={0.5}
          value={p.surface_m2 ?? ''}
          onChange={(e) =>
            setP({ ...p, surface_m2: toOptionalNumber(e.target.value) })
          }
          className="w-32 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
      </Field>

      <Field label="Notes">
        <textarea
          value={p.notes ?? ''}
          onChange={(e) =>
            setP({ ...p, notes: e.target.value || undefined })
          }
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
              if (
                !(await confirmDialog({
                  title: `Supprimer la pièce ${initial.nom} (${initial.trigramme}) ?`,
                  message:
                    'La vérification d\'intégrité (end-points, volets, appareils) sera proposée.',
                  confirmLabel: 'Continuer',
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

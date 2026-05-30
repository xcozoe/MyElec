import { useEffect, useState } from 'react'
import {
  COMMANDES_LOCALES_VOLET,
  MOTORISATIONS_VOLET,
  MURS,
  TYPES_VOLET,
  type CommandeLocaleVolet,
  type Ligne,
  type MotorisationVolet,
  type Mur,
  type Piece,
  type TypeVolet,
  type Volet,
} from '../types/electrical'
import {
  getTrigramme,
  nextNumeroVolet,
  voletId,
} from '../utils/idGenerator'
import { toOptionalNumber, toPositiveInt } from '../utils/form'
import { Field } from './Field'
import { useConfirm } from './Dialogs'
import { useEditorGuard } from './useEditorGuard'

export function VoletEditor({
  mode,
  initial,
  pieces,
  lignes,
  allVolets,
  onSave,
  onDelete,
  onCancel,
}: {
  mode: 'create' | 'edit'
  initial: Volet
  pieces: Piece[]
  lignes: Ligne[]
  allVolets: Volet[]
  onSave: (
    next: Volet,
    description?: string,
    options?: { thenNew?: boolean },
  ) => Promise<void> | void
  onDelete?: () => Promise<void> | void
  onCancel: () => void
}) {
  const [v, setV] = useState<Volet>(initial)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const confirmDialog = useConfirm()
  const handleClose = useEditorGuard(v, initial, onCancel)

  useEffect(() => {
    setV(initial)
    setError(null)
  }, [initial])

  const trigramme = getTrigramme(pieces, v.piece_id)

  useEffect(() => {
    if (mode !== 'create') return
    const nextNum = nextNumeroVolet(allVolets, v.piece_id)
    const nextId = trigramme ? voletId(trigramme, nextNum) : ''
    if (v.numero !== nextNum || v.id !== nextId) {
      setV((prev) => ({ ...prev, numero: nextNum, id: nextId }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, v.piece_id, trigramme])

  const motorise = v.motorisation.startsWith('electrique')

  const handleSave = async (thenNew = false) => {
    setError(null)
    if (!v.piece_id) return setError('Pièce requise.')
    if (!Number.isInteger(v.numero) || v.numero < 1)
      return setError('Numéro invalide — doit être un entier ≥ 1.')
    if (!v.id.trim()) return setError('ID manquant — vérifiez la pièce.')
    if (allVolets.some((x) => x.id === v.id && x.id !== initial.id))
      return setError(`L'ID ${v.id} existe déjà.`)
    if (motorise && !v.ligne_id)
      return setError('Volet motorisé : la ligne d\'alimentation est obligatoire.')
    if (v.ligne_id && lignes.length > 0 && !lignes.some((l) => l.id === v.ligne_id))
      return setError(`La ligne ${v.ligne_id} n'existe pas.`)
    setSaving(true)
    try {
      await onSave(v, undefined, { thenNew })
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
          {mode === 'create' ? 'Nouveau volet / store' : 'Éditer le volet'}
        </h3>
        <button
          onClick={handleClose}
          className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5"
        >
          Fermer
        </button>
      </div>

      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
          ID auto-généré
        </div>
        <div className="font-mono text-sm">{v.id || '— renseignez la pièce —'}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Pièce">
          <select
            value={v.piece_id}
            onChange={(e) => setV({ ...v, piece_id: e.target.value })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            <option value="">— Choisir —</option>
            {pieces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom} ({p.trigramme})
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Numéro"
          hint={mode === 'edit' ? 'Figé en édition (il fait partie de l’ID)' : undefined}
        >
          <input
            type="number"
            min={1}
            value={v.numero}
            disabled={mode === 'edit'}
            onChange={(e) => {
              const num = toPositiveInt(e.target.value, v.numero)
              setV({
                ...v,
                numero: num,
                id: mode === 'create' && trigramme ? voletId(trigramme, num) : v.id,
              })
            }}
            className="w-24 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <select
            value={v.type}
            onChange={(e) => setV({ ...v, type: e.target.value as TypeVolet })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            {TYPES_VOLET.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Motorisation">
          <select
            value={v.motorisation}
            onChange={(e) =>
              setV({ ...v, motorisation: e.target.value as MotorisationVolet })
            }
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            {MOTORISATIONS_VOLET.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Commande locale">
          <select
            value={v.commande_locale ?? ''}
            onChange={(e) =>
              setV({
                ...v,
                commande_locale:
                  (e.target.value || undefined) as CommandeLocaleVolet | undefined,
              })
            }
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            <option value="">—</option>
            {COMMANDES_LOCALES_VOLET.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Centralisé ?">
          <select
            value={v.commande_centralisee ?? ''}
            onChange={(e) =>
              setV({
                ...v,
                commande_centralisee:
                  (e.target.value || undefined) as 'oui' | 'non' | 'partielle' | undefined,
              })
            }
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            <option value="">—</option>
            <option value="oui">Oui</option>
            <option value="non">Non</option>
            <option value="partielle">Partielle</option>
          </select>
        </Field>
        <Field label="Mur (optionnel)">
          <select
            value={v.mur ?? ''}
            onChange={(e) =>
              setV({ ...v, mur: (e.target.value || undefined) as Mur | undefined })
            }
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            <option value="">—</option>
            {MURS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.value} — {m.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Largeur (cm)">
          <input
            type="number"
            min={0}
            value={v.largeur_cm ?? ''}
            onChange={(e) =>
              setV({ ...v, largeur_cm: toOptionalNumber(e.target.value) })
            }
            className="w-24 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          />
        </Field>
      </div>

      <Field
        label={
          motorise
            ? "Ligne d'alimentation (obligatoire pour un volet motorisé)"
            : "Ligne d'alimentation (optionnel — volet manuel)"
        }
      >
        {lignes.length === 0 ? (
          <input
            type="text"
            value={v.ligne_id ?? ''}
            onChange={(e) => setV({ ...v, ligne_id: e.target.value || undefined })}
            placeholder="Aucune ligne en base — laissez vide ou tapez l'ID prévu"
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-mono"
          />
        ) : (
          <select
            value={v.ligne_id ?? ''}
            onChange={(e) => setV({ ...v, ligne_id: e.target.value || undefined })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            <option value="">— Aucune —</option>
            {lignes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id} — {l.libelle}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Notes">
        <textarea
          value={v.notes ?? ''}
          onChange={(e) => setV({ ...v, notes: e.target.value || undefined })}
          rows={2}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
      </Field>

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
            Créer et saisir le suivant
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
                  title: `Supprimer le volet ${v.id} ?`,
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

export function emptyVolet(pieceId: string, pieces: Piece[], allVolets: Volet[]): Volet {
  const trigramme = getTrigramme(pieces, pieceId)
  const numero = nextNumeroVolet(allVolets, pieceId)
  return {
    id: trigramme ? voletId(trigramme, numero) : '',
    piece_id: pieceId,
    numero,
    type: 'volet_roulant',
    motorisation: 'electrique_filaire',
  }
}

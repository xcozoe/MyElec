import { useEffect, useMemo, useState } from 'react'
import {
  ENDPOINT_TYPES,
  MURS,
  TYPES_COMMANDE,
  TYPES_LUMINAIRE,
  TYPES_PRISE,
  type EndPoint,
  type EndPointType,
  type Ligne,
  type Mur,
  type Piece,
  type TypeCommande,
  type TypeLuminaire,
  type TypePrise,
} from '../types/electrical'
import { endpointId, getTrigramme, nextNumeroEndpoint } from '../utils/idGenerator'

export interface EndPointEditorProps {
  mode: 'create' | 'edit'
  initial: EndPoint
  pieces: Piece[]
  lignes: Ligne[]
  allEndpoints: EndPoint[]
  onSave: (
    next: EndPoint,
    description?: string,
    options?: { thenNew?: boolean },
  ) => Promise<void> | void
  onDelete?: () => Promise<void> | void
  onCancel: () => void
}

const SUGGESTIONS_USAGE = [
  'lave-vaisselle',
  'lave-linge',
  'sèche-linge',
  'frigo',
  'congélateur',
  'four',
  'plaque',
  'micro-ondes',
  'cafetière',
  'TV',
  'bureau',
  'éclairage indirect',
  'chargeur',
  'PC fixe',
]

export function EndPointEditor({
  mode,
  initial,
  pieces,
  lignes,
  allEndpoints,
  onSave,
  onDelete,
  onCancel,
}: EndPointEditorProps) {
  const [e, setE] = useState<EndPoint>(initial)
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setE(initial)
    setDescription('')
    setError(null)
  }, [initial])

  // En création, l'ID et le numero se recalculent automatiquement
  // dès qu'un des champs change (type, piece, mur).
  const piece = pieces.find((p) => p.id === e.piece_id)
  const trigramme = piece?.trigramme ?? ''

  useEffect(() => {
    if (mode !== 'create') return
    const nextNum = nextNumeroEndpoint(allEndpoints, e.type, e.piece_id, e.mur)
    const nextId = trigramme ? endpointId(e.type, trigramme, e.mur, nextNum) : ''
    if (e.numero !== nextNum || e.id !== nextId) {
      setE((prev) => ({ ...prev, numero: nextNum, id: nextId }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, e.type, e.piece_id, e.mur, trigramme])

  const showPriseFields = e.type === 'PC' || e.type === 'PD'
  const showLuminaireFields = e.type === 'PL'
  const showCommandeOnly = e.type === 'IN' || e.type === 'BT'

  const handleSave = async (thenNew = false) => {
    setError(null)
    if (!e.piece_id) return setError('Pièce requise.')
    if (!e.id.trim()) return setError('ID introuvable — vérifie les 4 champs (type, pièce, mur, numéro).')
    if (
      mode === 'create' &&
      allEndpoints.some((x) => x.id === e.id)
    )
      return setError(`L'ID ${e.id} existe déjà — augmente le numéro.`)
    if (
      e.ligne_id &&
      lignes.length > 0 &&
      !lignes.some((l) => l.id === e.ligne_id)
    )
      return setError(`La ligne ${e.ligne_id} n'existe pas.`)

    setSaving(true)
    try {
      await onSave(e, description.trim() || undefined, { thenNew })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const pieceOptions = useMemo(
    () => [...pieces].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    [pieces],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {mode === 'create' ? 'Nouvel end-point' : 'Éditer l\'end-point'}
        </h3>
        <button
          onClick={onCancel}
          className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5"
        >
          Fermer
        </button>
      </div>

      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
          ID auto-généré
        </div>
        <div className="font-mono text-sm">{e.id || '— renseignez les 4 champs —'}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <select
            value={e.type}
            onChange={(ev) => setE({ ...e, type: ev.target.value as EndPointType })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            {ENDPOINT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Pièce">
          <select
            value={e.piece_id}
            onChange={(ev) => setE({ ...e, piece_id: ev.target.value })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            <option value="">— Choisir —</option>
            {pieceOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom} ({p.trigramme})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Mur / position">
          <select
            value={e.mur}
            onChange={(ev) => setE({ ...e, mur: ev.target.value as Mur })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            {MURS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.value} — {m.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Numéro"
          hint={mode === 'create' ? 'Auto-incrémenté pour ce (type, pièce, mur)' : undefined}
        >
          <input
            type="number"
            min={1}
            value={e.numero}
            onChange={(ev) => {
              const num = Number(ev.target.value)
              setE({
                ...e,
                numero: num,
                id: trigramme && mode === 'create' ? endpointId(e.type, trigramme, e.mur, num) : e.id,
              })
            }}
            className="w-24 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          />
        </Field>
      </div>

      <Field label="Détail de position" hint='ex : "près de la porte", "30 cm du sol"'>
        <input
          type="text"
          value={e.position_detail ?? ''}
          onChange={(ev) =>
            setE({ ...e, position_detail: ev.target.value || undefined })
          }
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
      </Field>

      <Field label="Ligne d'alimentation">
        {lignes.length === 0 ? (
          <input
            type="text"
            value={e.ligne_id ?? ''}
            onChange={(ev) => setE({ ...e, ligne_id: ev.target.value || undefined })}
            placeholder="Aucune ligne en base — laissez vide ou tapez l'ID prévu"
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-mono"
          />
        ) : (
          <select
            value={e.ligne_id ?? ''}
            onChange={(ev) => setE({ ...e, ligne_id: ev.target.value || undefined })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            <option value="">— Aucune / à définir —</option>
            {lignes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id} — {l.libelle}
              </option>
            ))}
          </select>
        )}
      </Field>

      {/* ---------- Champs spécifiques au type ---------- */}

      {showPriseFields && (
        <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            Caractéristiques prise
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type de prise">
              <select
                value={e.type_prise ?? ''}
                onChange={(ev) =>
                  setE({
                    ...e,
                    type_prise: (ev.target.value || undefined) as TypePrise | undefined,
                  })
                }
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
              >
                <option value="">—</option>
                {TYPES_PRISE.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nb combinées" hint="1 = simple, 2 = double, 3 = triple…">
              <input
                type="number"
                min={1}
                max={6}
                value={e.nb_combinees ?? ''}
                onChange={(ev) =>
                  setE({
                    ...e,
                    nb_combinees: ev.target.value ? Number(ev.target.value) : undefined,
                  })
                }
                className="w-24 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
              />
            </Field>
          </div>
          <Field label="Usage principal">
            <input
              list="endpoint-usages"
              type="text"
              value={e.usage_principal ?? ''}
              onChange={(ev) =>
                setE({ ...e, usage_principal: ev.target.value || undefined })
              }
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
            />
            <datalist id="endpoint-usages">
              {SUGGESTIONS_USAGE.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
        </div>
      )}

      {showLuminaireFields && (
        <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            Caractéristiques luminaire
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type de luminaire">
              <select
                value={e.type_luminaire ?? ''}
                onChange={(ev) =>
                  setE({
                    ...e,
                    type_luminaire: (ev.target.value || undefined) as
                      | TypeLuminaire
                      | undefined,
                  })
                }
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
              >
                <option value="">—</option>
                {TYPES_LUMINAIRE.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Commande">
              <select
                value={e.commande ?? ''}
                onChange={(ev) =>
                  setE({
                    ...e,
                    commande: (ev.target.value || undefined) as TypeCommande | undefined,
                  })
                }
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
              >
                <option value="">—</option>
                {TYPES_COMMANDE.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Puissance unitaire (W)">
              <input
                type="number"
                min={0}
                step={1}
                value={e.puissance_w ?? ''}
                onChange={(ev) =>
                  setE({
                    ...e,
                    puissance_w: ev.target.value ? Number(ev.target.value) : undefined,
                  })
                }
                className="w-24 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
              />
            </Field>
            <Field label="Nb de sources">
              <input
                type="number"
                min={1}
                step={1}
                value={e.nb_sources ?? ''}
                onChange={(ev) =>
                  setE({
                    ...e,
                    nb_sources: ev.target.value ? Number(ev.target.value) : undefined,
                  })
                }
                className="w-24 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
              />
            </Field>
            <Field label="Lumens unitaires (optionnel)">
              <input
                type="number"
                min={0}
                step={50}
                value={e.lumens_unitaires ?? ''}
                onChange={(ev) =>
                  setE({
                    ...e,
                    lumens_unitaires: ev.target.value
                      ? Number(ev.target.value)
                      : undefined,
                  })
                }
                className="w-28 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
              />
            </Field>
          </div>
        </div>
      )}

      {showCommandeOnly && (
        <Field label="Type de commande">
          <select
            value={e.commande ?? ''}
            onChange={(ev) =>
              setE({
                ...e,
                commande: (ev.target.value || undefined) as TypeCommande | undefined,
              })
            }
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            <option value="">—</option>
            {TYPES_COMMANDE.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Notes">
        <textarea
          value={e.notes ?? ''}
          onChange={(ev) => setE({ ...e, notes: ev.target.value || undefined })}
          rows={2}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
      </Field>

      <Field label="Description de la modification">
        <input
          type="text"
          value={description}
          onChange={(ev) => setDescription(ev.target.value)}
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
          onClick={onCancel}
          className="rounded-md border border-slate-300 dark:border-slate-700 px-4 py-1.5 text-sm"
        >
          Annuler
        </button>
        {mode === 'edit' && onDelete && (
          <button
            onClick={async () => {
              if (confirm(`Supprimer l'end-point ${e.id} ?`)) await onDelete()
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

// Helper utilisé depuis App pour amorcer l'éditeur en création.
export function emptyEndPoint(
  pieceId: string,
  pieces: Piece[],
  allEndpoints: EndPoint[],
  type: EndPointType = 'PC',
): EndPoint {
  const trigramme = getTrigramme(pieces, pieceId)
  const mur: Mur = 'ME'
  const numero = nextNumeroEndpoint(allEndpoints, type, pieceId, mur)
  return {
    id: trigramme ? endpointId(type, trigramme, mur, numero) : '',
    type,
    piece_id: pieceId,
    mur,
    numero,
  }
}

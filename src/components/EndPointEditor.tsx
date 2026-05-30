import { useEffect, useMemo, useState } from 'react'
import {
  ALIMENTATIONS_COMMANDE,
  ENDPOINT_TYPES,
  MURS,
  TYPES_COMMANDE,
  TYPES_LUMINAIRE,
  TYPES_PRISE,
  type AlimentationCommande,
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
import { toOptionalNumber, toPositiveInt } from '../utils/form'
import { Field } from './Field'
import { Section } from './Section'
import { useConfirm } from './Dialogs'
import { useEditorGuard } from './useEditorGuard'

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
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const confirmDialog = useConfirm()
  const handleClose = useEditorGuard(e, initial, onCancel)

  useEffect(() => {
    setE(initial)
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
  }, [mode, e.type, e.piece_id, e.mur, trigramme, allEndpoints])

  const showPriseFields = e.type === 'PC' || e.type === 'PD'
  const showLuminaireFields = e.type === 'PL'
  const showCommandeOnly = e.type === 'IN' || e.type === 'BT'

  // Alimentation : par défaut 'filaire' pour IN/BT, ignoré pour les autres types.
  const alimentation: AlimentationCommande = e.alimentation ?? 'filaire'
  const isSansFil = showCommandeOnly && alimentation !== 'filaire'
  const showLigneField = !isSansFil

  const handleSave = async (thenNew = false) => {
    setError(null)
    if (!e.piece_id) return setError('Pièce requise.')
    if (!Number.isInteger(e.numero) || e.numero < 1)
      return setError('Numéro invalide — doit être un entier ≥ 1.')
    if (!e.id.trim()) return setError('ID introuvable — vérifie les 4 champs (type, pièce, mur, numéro).')
    if (allEndpoints.some((x) => x.id === e.id && x.id !== initial.id))
      return setError(`L'ID ${e.id} existe déjà — augmente le numéro.`)
    if (
      e.ligne_id &&
      lignes.length > 0 &&
      !lignes.some((l) => l.id === e.ligne_id)
    )
      return setError(`La ligne ${e.ligne_id} n'existe pas.`)

    setSaving(true)
    try {
      await onSave(e, undefined, { thenNew })
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
          onClick={handleClose}
          className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5"
        >
          Fermer
        </button>
      </div>

      <Section title="Identification">
        <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
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
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
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
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
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
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
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
            hint={
              mode === 'create'
                ? 'Auto-incrémenté pour ce (type, pièce, mur)'
                : 'Figé en édition (il fait partie de l’ID)'
            }
          >
            <input
              type="number"
              min={1}
              value={e.numero}
              disabled={mode === 'edit'}
              onChange={(ev) => {
                const num = toPositiveInt(ev.target.value, e.numero)
                setE({
                  ...e,
                  numero: num,
                  id: trigramme && mode === 'create' ? endpointId(e.type, trigramme, e.mur, num) : e.id,
                })
              }}
              className="w-24 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
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
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </Field>
      </Section>

      <Section title="Définition">
      {showLigneField && (
        <Field label="Ligne d'alimentation">
          {lignes.length === 0 ? (
            <input
              type="text"
              value={e.ligne_id ?? ''}
              onChange={(ev) => setE({ ...e, ligne_id: ev.target.value || undefined })}
              placeholder="Aucune ligne en base — laissez vide ou tapez l'ID prévu"
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
            />
          ) : (
            <select
              value={e.ligne_id ?? ''}
              onChange={(ev) => setE({ ...e, ligne_id: ev.target.value || undefined })}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
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
      )}

      {/* ---------- Champs spécifiques au type ---------- */}

      {showPriseFields && (
        <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
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
                  setE({ ...e, nb_combinees: toOptionalNumber(ev.target.value) })
                }
                className="w-24 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
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
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
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
        <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
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
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
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
                  setE({ ...e, puissance_w: toOptionalNumber(ev.target.value) })
                }
                className="w-24 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Nb de sources">
              <input
                type="number"
                min={1}
                step={1}
                value={e.nb_sources ?? ''}
                onChange={(ev) =>
                  setE({ ...e, nb_sources: toOptionalNumber(ev.target.value) })
                }
                className="w-24 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Lumens unitaires (optionnel)">
              <input
                type="number"
                min={0}
                step={50}
                value={e.lumens_unitaires ?? ''}
                onChange={(ev) =>
                  setE({ ...e, lumens_unitaires: toOptionalNumber(ev.target.value) })
                }
                className="w-28 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </Field>
          </div>
        </div>
      )}

      {showCommandeOnly && (
        <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Caractéristiques commande
          </div>
          <Field label="Type de commande">
            <select
              value={e.commande ?? ''}
              onChange={(ev) =>
                setE({
                  ...e,
                  commande: (ev.target.value || undefined) as TypeCommande | undefined,
                })
              }
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {TYPES_COMMANDE.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Alimentation"
            hint='ex : Philips Hue Tap / Dimmer → "Sans-fil — pile"'
          >
            <select
              value={alimentation}
              onChange={(ev) => {
                const next = ev.target.value as AlimentationCommande
                setE({
                  ...e,
                  alimentation: next,
                  // Si on passe en sans-fil, on retire la référence à la ligne.
                  ligne_id: next === 'filaire' ? e.ligne_id : undefined,
                })
              }}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            >
              {ALIMENTATIONS_COMMANDE.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

        <Field label="Notes">
          <textarea
            value={e.notes ?? ''}
            onChange={(ev) => setE({ ...e, notes: ev.target.value || undefined })}
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
                  title: `Supprimer l'end-point ${e.id} ?`,
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

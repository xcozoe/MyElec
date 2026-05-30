import { useEffect, useMemo, useState } from 'react'
import {
  CATEGORIES_APPAREIL,
  PROFILS_USAGE,
  type AppareilFixe,
  type CategorieAppareil,
  type EndPoint,
  type Ligne,
  type Piece,
  type ProfilUsage,
} from '../types/electrical'
import {
  appareilId,
  getTrigramme,
  nextNumeroAppareil,
} from '../utils/idGenerator'
import { toOptionalNumber, toPositiveInt } from '../utils/form'
import { Field } from './Field'
import { useConfirm } from './Dialogs'
import { useEditorGuard } from './useEditorGuard'

export function AppareilFixeEditor({
  mode,
  initial,
  pieces,
  lignes,
  endpoints,
  allAppareils,
  onSave,
  onDelete,
  onCancel,
}: {
  mode: 'create' | 'edit'
  initial: AppareilFixe
  pieces: Piece[]
  lignes: Ligne[]
  endpoints: EndPoint[]
  allAppareils: AppareilFixe[]
  onSave: (
    next: AppareilFixe,
    description?: string,
    options?: { thenNew?: boolean },
  ) => Promise<void> | void
  onDelete?: () => Promise<void> | void
  onCancel: () => void
}) {
  const [a, setA] = useState<AppareilFixe>(initial)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [raccordement, setRaccordement] = useState<
    'aucun' | 'ligne' | 'prise'
  >(
    initial.ligne_id ? 'ligne' : initial.branche_sur ? 'prise' : 'aucun',
  )
  const confirmDialog = useConfirm()
  const handleClose = useEditorGuard(a, initial, onCancel)

  useEffect(() => {
    setA(initial)
    setError(null)
    setRaccordement(
      initial.ligne_id ? 'ligne' : initial.branche_sur ? 'prise' : 'aucun',
    )
  }, [initial])

  const trigramme = getTrigramme(pieces, a.piece_id)

  useEffect(() => {
    if (mode !== 'create') return
    const nextNum = nextNumeroAppareil(allAppareils, a.piece_id)
    const nextId = trigramme ? appareilId(trigramme, nextNum) : ''
    if (a.numero !== nextNum || a.id !== nextId) {
      setA((prev) => ({ ...prev, numero: nextNum, id: nextId }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, a.piece_id, trigramme])

  // Prises de la pièce (PC + PD) pour le picker "Branché sur"
  const prisesPiece = useMemo(
    () =>
      endpoints
        .filter(
          (e) =>
            e.piece_id === a.piece_id && (e.type === 'PC' || e.type === 'PD'),
        )
        .sort((x, y) => x.id.localeCompare(y.id)),
    [endpoints, a.piece_id],
  )

  const handleSave = async (thenNew = false) => {
    setError(null)
    if (!a.piece_id) return setError('Pièce requise.')
    if (!a.nom.trim()) return setError('Nom requis.')
    if (!Number.isInteger(a.numero) || a.numero < 1)
      return setError('Numéro invalide — doit être un entier ≥ 1.')
    if (!a.id.trim()) return setError('ID manquant — vérifiez la pièce.')
    if (allAppareils.some((x) => x.id === a.id && x.id !== initial.id))
      return setError(`L'ID ${a.id} existe déjà.`)
    // XOR strict ligne_id / branche_sur — déjà géré par le picker UI
    // (raccordement = 'aucun' | 'ligne' | 'prise') mais on revalide.
    const cleaned: AppareilFixe = {
      ...a,
      ligne_id: raccordement === 'ligne' ? a.ligne_id : undefined,
      branche_sur: raccordement === 'prise' ? a.branche_sur : undefined,
    }
    // Si un mode de raccordement est choisi, sa cible est obligatoire —
    // sinon l'UI afficherait "Direct sur une ligne" alors que l'appareil
    // serait enregistré comme non raccordé.
    if (raccordement === 'ligne' && !cleaned.ligne_id)
      return setError('Sélectionnez la ligne d\'alimentation (ou choisissez « Non renseigné »).')
    if (raccordement === 'prise' && !cleaned.branche_sur)
      return setError('Sélectionnez la prise (ou choisissez « Non renseigné »).')
    if (cleaned.ligne_id && cleaned.branche_sur)
      return setError("Un appareil ne peut être à la fois sur une ligne ET sur une prise.")
    if (
      cleaned.ligne_id &&
      lignes.length > 0 &&
      !lignes.some((l) => l.id === cleaned.ligne_id)
    )
      return setError(`La ligne ${cleaned.ligne_id} n'existe pas.`)
    if (
      cleaned.branche_sur &&
      !endpoints.some((e) => e.id === cleaned.branche_sur)
    )
      return setError(`L'end-point ${cleaned.branche_sur} n'existe pas.`)
    setSaving(true)
    try {
      await onSave(cleaned, undefined, { thenNew })
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
          {mode === 'create' ? 'Nouvel appareil fixe' : 'Éditer l\'appareil'}
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
        <div className="font-mono text-sm">{a.id || '— renseignez la pièce —'}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Pièce">
          <select
            value={a.piece_id}
            onChange={(e) => setA({ ...a, piece_id: e.target.value })}
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
            value={a.numero}
            disabled={mode === 'edit'}
            onChange={(e) => {
              const num = toPositiveInt(e.target.value, a.numero)
              setA({
                ...a,
                numero: num,
                id: mode === 'create' && trigramme ? appareilId(trigramme, num) : a.id,
              })
            }}
            className="w-24 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </Field>
      </div>

      <Field label="Nom" hint='ex : "Lave-vaisselle", "Plaque induction Neff"'>
        <input
          type="text"
          value={a.nom}
          onChange={(e) => setA({ ...a, nom: e.target.value })}
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Catégorie">
          <select
            value={a.categorie}
            onChange={(e) =>
              setA({ ...a, categorie: e.target.value as CategorieAppareil })
            }
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            {CATEGORIES_APPAREIL.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Profil d'usage">
          <select
            value={a.profil_usage}
            onChange={(e) =>
              setA({ ...a, profil_usage: e.target.value as ProfilUsage })
            }
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            {PROFILS_USAGE.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Marque">
          <input
            type="text"
            value={a.marque ?? ''}
            onChange={(e) => setA({ ...a, marque: e.target.value || undefined })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          />
        </Field>
        <Field label="Modèle">
          <input
            type="text"
            value={a.modele ?? ''}
            onChange={(e) => setA({ ...a, modele: e.target.value || undefined })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          />
        </Field>
        <Field label="Puissance nominale (W)">
          <input
            type="number"
            min={0}
            value={a.puissance_nominale_w ?? ''}
            onChange={(e) =>
              setA({ ...a, puissance_nominale_w: toOptionalNumber(e.target.value) })
            }
            className="w-28 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          />
        </Field>
        <Field label="Puissance crête (W)">
          <input
            type="number"
            min={0}
            value={a.puissance_pic_w ?? ''}
            onChange={(e) =>
              setA({ ...a, puissance_pic_w: toOptionalNumber(e.target.value) })
            }
            className="w-28 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          />
        </Field>
      </div>

      <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
          Raccordement électrique
        </div>
        <div className="flex gap-3 text-sm">
          {(['aucun', 'ligne', 'prise'] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="raccordement"
                checked={raccordement === mode}
                onChange={() => setRaccordement(mode)}
              />
              {mode === 'aucun' && 'Non renseigné'}
              {mode === 'ligne' && 'Direct sur une ligne'}
              {mode === 'prise' && 'Branché sur une prise'}
            </label>
          ))}
        </div>

        {raccordement === 'ligne' && (
          <Field label="Ligne">
            {lignes.length === 0 ? (
              <input
                type="text"
                value={a.ligne_id ?? ''}
                onChange={(e) =>
                  setA({ ...a, ligne_id: e.target.value || undefined })
                }
                placeholder="Tapez l'ID de la ligne (à créer si nécessaire)"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-mono"
              />
            ) : (
              <select
                value={a.ligne_id ?? ''}
                onChange={(e) =>
                  setA({ ...a, ligne_id: e.target.value || undefined })
                }
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
              >
                <option value="">— Choisir —</option>
                {lignes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.id} — {l.libelle}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}

        {raccordement === 'prise' && (
          <Field
            label="Prise (PC ou PD de la même pièce)"
            hint={
              prisesPiece.length === 0
                ? "Aucune prise n'est encore enregistrée pour cette pièce."
                : undefined
            }
          >
            <select
              value={a.branche_sur ?? ''}
              onChange={(e) =>
                setA({ ...a, branche_sur: e.target.value || undefined })
              }
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
            >
              <option value="">— Choisir —</option>
              {prisesPiece.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id} — {e.usage_principal ?? '(usage non renseigné)'}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <Field label="Usage principal">
        <input
          type="text"
          value={a.usage_principal ?? ''}
          onChange={(e) =>
            setA({ ...a, usage_principal: e.target.value || undefined })
          }
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
        />
      </Field>

      <Field label="Notes">
        <textarea
          value={a.notes ?? ''}
          onChange={(e) => setA({ ...a, notes: e.target.value || undefined })}
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
                  title: `Supprimer l'appareil ${a.nom} ?`,
                  message: a.id,
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

export function emptyAppareil(
  pieceId: string,
  pieces: Piece[],
  allAppareils: AppareilFixe[],
): AppareilFixe {
  const trigramme = getTrigramme(pieces, pieceId)
  const numero = nextNumeroAppareil(allAppareils, pieceId)
  return {
    id: trigramme ? appareilId(trigramme, numero) : '',
    piece_id: pieceId,
    numero,
    nom: '',
    categorie: 'electromenager',
    profil_usage: 'cyclique',
  }
}

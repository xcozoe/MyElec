import { useEffect, useMemo, useState } from 'react'
import { PhotoField } from './PhotoField'
import { Field } from './Field'
import { useConfirm } from './Dialogs'
import { useEditorGuard } from './useEditorGuard'
import { toPositiveInt } from '../utils/form'
import {
  PHASES,
  POLES,
  STATUTS,
  TYPES_PROTECTION,
  endpointTypeLabel,
  type AppareilFixe,
  type Disjoncteur,
  type EndPoint,
  type Ligne,
  type Phase,
  type Piece,
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
  // Cross-ref Phase 2 (optionnel — affiché si fourni)
  lignes?: Ligne[]
  endpoints?: EndPoint[]
  appareils?: AppareilFixe[]
  pieces?: Piece[]
  onOpenLigne?: (ligneId: string) => void
  /** Ouvre l'éditeur de ligne pré-rempli depuis ce disjoncteur. */
  onCreateLigne?: () => void
}

export function DisjoncteurEditor({
  mode,
  tableau,
  rangeeId,
  initial,
  onSave,
  onDelete,
  onCancel,
  lignes,
  endpoints,
  appareils,
  pieces,
  onOpenLigne,
  onCreateLigne,
}: DisjoncteurEditorProps) {
  const [d, setD] = useState<Disjoncteur>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const confirmDialog = useConfirm()
  const handleClose = useEditorGuard(d, initial, onCancel)

  useEffect(() => {
    setD(initial)
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

  // Vrai aussi en édition : renommer un disjoncteur vers un ID déjà pris dans
  // le tableau doit être bloqué (on s'exclut soi-même via initial.id).
  const isDuplicateId = tableau.rangees.some((r) =>
    r.disjoncteurs.some((dj) => dj.id === d.id && dj.id !== initial.id),
  )

  const handleSave = async () => {
    setError(null)
    if (!d.id.trim()) return setError('ID requis.')
    if (isDuplicateId) return setError('Cet ID existe déjà dans ce tableau.')
    if (!d.etiquette.trim()) return setError('Étiquette requise.')
    setSaving(true)
    try {
      await onSave(d, undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const rangee = tableau.rangees.find((r) => r.id === rangeeId)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <PhotoField
            value={d.photo_url}
            onChange={(url) => setD({ ...d, photo_url: url })}
            alt={`${d.id} — ${d.etiquette}`}
          />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">
              {mode === 'create' ? 'Nouveau disjoncteur' : 'Éditer le disjoncteur'}
            </h3>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {tableau.nom} · {rangee?.libelle ?? rangeeId}
            </div>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
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
              : 'Convention : [code-tableau]-[code-rangée]-[code-départ]'
          }
        >
          <input
            type="text"
            value={d.id}
            onChange={(e) => setD({ ...d, id: e.target.value })}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
          />
        </Field>

        <div className="flex gap-3 items-start">
          <div className="shrink-0">
            <Field label="Position dans la rangée">
              <input
                type="number"
                min={1}
                value={d.position}
                onChange={(e) =>
                  setD({ ...d, position: toPositiveInt(e.target.value, d.position) })
                }
                className="w-24 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </Field>
          </div>
          <div className="flex-1 min-w-0">
            <Field label="Étiquette">
              <input
                type="text"
                value={d.etiquette}
                onChange={(e) => setD({ ...d, etiquette: e.target.value })}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Définition">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Type de protection">
            <select
              value={d.type_protection}
              onChange={(e) =>
                setD({ ...d, type_protection: e.target.value as TypeProtection })
              }
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
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
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
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
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
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
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
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
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            >
              {STATUTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Différentiel de protection" hint="Disponible : différentiels du même tableau">
            <select
              value={d.differentiel_parent_id ?? ''}
              onChange={(e) =>
                setD({
                  ...d,
                  differentiel_parent_id: e.target.value || undefined,
                })
              }
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
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

        <Field label="Notes">
          <textarea
            value={d.notes ?? ''}
            onChange={(e) => setD({ ...d, notes: e.target.value || undefined })}
            rows={3}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
        </Field>
      </Section>

      <Section title="Alimentation">
        {mode === 'edit' && lignes && endpoints && appareils ? (
          <CrossRef
            disjoncteurId={d.id}
            lignes={lignes}
            endpoints={endpoints}
            appareils={appareils}
            pieces={pieces ?? []}
            onOpenLigne={onOpenLigne}
            onCreateLigne={onCreateLigne}
          />
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enregistrez le disjoncteur pour y rattacher des lignes et des
            end-points.
          </p>
        )}
      </Section>

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
                  title: `Supprimer le disjoncteur ${d.id} ?`,
                  message: 'Son historique passé sera conservé.',
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

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4 sm:p-5 shadow-sm space-y-4">
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {title}
      </h4>
      {children}
    </section>
  )
}

function CrossRef({
  disjoncteurId,
  lignes,
  endpoints,
  appareils,
  pieces,
  onOpenLigne,
  onCreateLigne,
}: {
  disjoncteurId: string
  lignes: Ligne[]
  endpoints: EndPoint[]
  appareils: AppareilFixe[]
  pieces: Piece[]
  onOpenLigne?: (ligneId: string) => void
  onCreateLigne?: () => void
}) {
  const lignesDuDj = useMemo(
    () => lignes.filter((l) => l.disjoncteur_id === disjoncteurId),
    [lignes, disjoncteurId],
  )
  const lignesIds = new Set(lignesDuDj.map((l) => l.id))
  const endpointsDuDj = endpoints.filter((e) => e.ligne_id && lignesIds.has(e.ligne_id))
  const appareilsDirect = appareils.filter((a) => a.ligne_id && lignesIds.has(a.ligne_id))
  const endpointIds = new Set(endpointsDuDj.map((e) => e.id))
  const appareilsViaPrise = appareils.filter(
    (a) => a.branche_sur && endpointIds.has(a.branche_sur),
  )

  const isEmpty =
    lignesDuDj.length === 0 &&
    endpointsDuDj.length === 0 &&
    appareilsDirect.length === 0 &&
    appareilsViaPrise.length === 0

  return (
    <div className="space-y-3">
      {onCreateLigne && (
        <button
          onClick={onCreateLigne}
          className="rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-1.5 text-xs"
        >
          + Créer une ligne sur ce départ
        </button>
      )}

      {isEmpty ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Aucune ligne, end-point ni appareil ne référence ce disjoncteur pour
          le moment.
        </p>
      ) : (
        <>
          {lignesDuDj.length > 0 && (
            <CrossSection title="Lignes au départ">
              <ul className="space-y-1">
                {lignesDuDj.map((l) => (
                  <li key={l.id} className="text-xs">
                    <button
                      onClick={() => onOpenLigne?.(l.id)}
                      className="underline decoration-dotted hover:opacity-80 font-mono"
                    >
                      {l.id}
                    </button>{' '}
                    — {l.libelle}
                    {l.section_mm2 && (
                      <span className="text-slate-500 dark:text-slate-400">
                        {' '}· {l.section_mm2} mm²
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </CrossSection>
          )}

          {endpointsDuDj.length > 0 && (
            <CrossSection title="End-points desservis">
              <ul className="space-y-1">
                {endpointsDuDj.map((e) => {
                  const piece = pieces.find((p) => p.id === e.piece_id)
                  return (
                    <li key={e.id} className="text-xs">
                      <code className="rounded bg-white dark:bg-slate-800 px-1 py-0.5">
                        {e.id}
                      </code>{' '}
                      {endpointTypeLabel(e.type)}
                      {e.usage_principal && (
                        <span className="text-slate-500 dark:text-slate-400">
                          {' '}— {e.usage_principal}
                        </span>
                      )}
                      {piece && (
                        <span className="text-slate-500 dark:text-slate-400">
                          {' '}· {piece.nom}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </CrossSection>
          )}

          {(appareilsDirect.length > 0 || appareilsViaPrise.length > 0) && (
            <CrossSection title="Appareils desservis">
              <ul className="space-y-1">
                {appareilsDirect.map((a) => (
                  <li key={a.id} className="text-xs">
                    <strong>{a.nom}</strong>{' '}
                    <span className="text-slate-500 dark:text-slate-400">
                      (direct sur ligne)
                    </span>
                  </li>
                ))}
                {appareilsViaPrise.map((a) => (
                  <li key={a.id} className="text-xs">
                    <strong>{a.nom}</strong>{' '}
                    <span className="text-slate-500 dark:text-slate-400">
                      (via prise {a.branche_sur})
                    </span>
                  </li>
                ))}
              </ul>
            </CrossSection>
          )}
        </>
      )}
    </div>
  )
}

function CrossSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
        {title}
      </div>
      {children}
    </div>
  )
}

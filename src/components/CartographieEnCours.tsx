import { useMemo, useState } from 'react'
import type { Disjoncteur, Phase, Tableau } from '../types/electrical'
import type { Store } from '../hooks/useStore'
import { PHASE_STYLES } from '../utils/phaseStyle'

interface Row {
  tableau: Tableau
  rangeeId: string
  rangeeLibelle: string
  disjoncteur: Disjoncteur
}

function listInconnus(tableaux: Tableau[]): Row[] {
  const rows: Row[] = []
  for (const t of tableaux) {
    for (const r of t.rangees) {
      for (const d of r.disjoncteurs) {
        if (
          d.statut === 'libre' ||
          d.phase_affectation === 'inconnue' ||
          d.etiquette.trim() === '?' ||
          d.etiquette.trim() === ''
        ) {
          rows.push({
            tableau: t,
            rangeeId: r.id,
            rangeeLibelle: r.libelle,
            disjoncteur: d,
          })
        }
      }
    }
  }
  return rows
}

export function CartographieEnCours({
  state,
  onOpen,
}: {
  state: Store
  onOpen: (tableauId: string, disjoncteurId: string) => void
}) {
  const rows = useMemo(() => listInconnus(state.tableaux), [state.tableaux])
  const [session, setSession] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <h1 className="text-2xl font-semibold">Cartographie en cours</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {rows.length} disjoncteur(s) à identifier (étiquette manuscrite ou
            phase inconnue, ou statut libre).
          </p>
        </div>
        {rows.length > 0 && (
          <button
            onClick={() => {
              setSession((s) => !s)
              setStepIndex(0)
            }}
            className="rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-1.5 text-sm"
          >
            {session ? 'Quitter la session' : "Démarrer une session d'identification"}
          </button>
        )}
      </div>

      {session && rows.length > 0 ? (
        <SessionGuide
          rows={rows}
          stepIndex={Math.min(stepIndex, rows.length - 1)}
          onPrev={() => setStepIndex((i) => Math.max(0, i - 1))}
          onNext={() => setStepIndex((i) => Math.min(rows.length - 1, i + 1))}
          onSaveRow={async (row, update, description) => {
            await state.upsertDisjoncteur(
              row.tableau.id,
              row.rangeeId,
              { ...row.disjoncteur, ...update },
              description,
            )
          }}
          onOpen={() =>
            onOpen(rows[stepIndex].tableau.id, rows[stepIndex].disjoncteur.id)
          }
        />
      ) : (
        <table className="w-full text-sm border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
          <thead className="bg-slate-100 dark:bg-slate-900 text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2">Tableau / Rangée</th>
              <th className="px-3 py-2">Disjoncteur</th>
              <th className="px-3 py-2">Phase</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                >
                  Plus rien à identifier — bravo.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const phaseStyle = PHASE_STYLES[row.disjoncteur.phase_affectation]
              return (
                <tr
                  key={row.disjoncteur.id}
                  className="border-t border-slate-200 dark:border-slate-800"
                >
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.tableau.nom}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {row.rangeeLibelle}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs">
                      {row.disjoncteur.id}
                    </div>
                    <div>{row.disjoncteur.etiquette || '—'}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset ${phaseStyle.ring} ${phaseStyle.bg} ${phaseStyle.text}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${phaseStyle.dot}`}
                      />
                      {phaseStyle.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs uppercase">
                    {row.disjoncteur.statut}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                    {row.disjoncteur.notes ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() =>
                        onOpen(row.tableau.id, row.disjoncteur.id)
                      }
                      className="rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs"
                    >
                      Identifier
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function SessionGuide({
  rows,
  stepIndex,
  onPrev,
  onNext,
  onSaveRow,
  onOpen,
}: {
  rows: Row[]
  stepIndex: number
  onPrev: () => void
  onNext: () => void
  onSaveRow: (
    row: Row,
    update: Partial<Disjoncteur>,
    description?: string,
  ) => Promise<void>
  onOpen: () => void
}) {
  const row = rows[stepIndex]
  const [etiquette, setEtiquette] = useState(row.disjoncteur.etiquette)
  const [phase, setPhase] = useState<Phase>(row.disjoncteur.phase_affectation)
  const [statut, setStatut] = useState(row.disjoncteur.statut)
  const [notes, setNotes] = useState(row.disjoncteur.notes ?? '')
  const [busy, setBusy] = useState(false)

  // Reset form when stepping
  useMemo(() => {
    setEtiquette(row.disjoncteur.etiquette)
    setPhase(row.disjoncteur.phase_affectation)
    setStatut(row.disjoncteur.statut)
    setNotes(row.disjoncteur.notes ?? '')
  }, [row.disjoncteur.id])

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Étape {stepIndex + 1} / {rows.length}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onPrev}
            disabled={stepIndex === 0}
            className="rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs disabled:opacity-40"
          >
            ← Précédent
          </button>
          <button
            onClick={onNext}
            disabled={stepIndex >= rows.length - 1}
            className="rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs disabled:opacity-40"
          >
            Suivant →
          </button>
        </div>
      </div>

      <div className="text-xs text-slate-500 dark:text-slate-400">
        {row.tableau.nom} · {row.rangeeLibelle}
      </div>
      <div className="text-lg font-semibold font-mono">{row.disjoncteur.id}</div>
      <div className="text-sm text-slate-600 dark:text-slate-400">
        Étiquette actuelle : {row.disjoncteur.etiquette || '—'} · Phase actuelle :{' '}
        {row.disjoncteur.phase_affectation} · Statut : {row.disjoncteur.statut}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <div className="text-xs font-medium mb-1">Nouvelle étiquette</div>
          <input
            type="text"
            value={etiquette}
            onChange={(e) => setEtiquette(e.target.value)}
            placeholder="Ex : Frigo, PC Cuisine, …"
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5"
          />
        </label>
        <label className="block text-sm">
          <div className="text-xs font-medium mb-1">Phase identifiée</div>
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value as Phase)}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5"
          >
            <option value="L1">L1</option>
            <option value="L2">L2</option>
            <option value="L3">L3</option>
            <option value="TRI">TRI</option>
            <option value="inconnue">Toujours inconnue</option>
          </select>
        </label>
        <label className="block text-sm">
          <div className="text-xs font-medium mb-1">Statut</div>
          <select
            value={statut}
            onChange={(e) =>
              setStatut(e.target.value as Disjoncteur['statut'])
            }
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5"
          >
            <option value="actif">actif</option>
            <option value="libre">libre</option>
            <option value="desaffecte">désaffecté</option>
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <div className="text-xs font-medium mb-1">Notes / méthode du test</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ex : disjoncteur coupé → la prise PC_CUI_MG_1 s'est éteinte."
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await onSaveRow(
                row,
                {
                  etiquette,
                  phase_affectation: phase,
                  statut,
                  notes: notes.trim() || undefined,
                },
                `Identification physique (cartographie) — ${new Date().toLocaleString('fr-FR')}.`,
              )
              if (stepIndex < rows.length - 1) onNext()
            } finally {
              setBusy(false)
            }
          }}
          className="rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-1.5 text-sm disabled:opacity-50"
        >
          Enregistrer et passer au suivant
        </button>
        <button
          onClick={onOpen}
          className="rounded-md border border-slate-300 dark:border-slate-700 px-4 py-1.5 text-sm"
        >
          Ouvrir l'éditeur complet
        </button>
      </div>
    </div>
  )
}

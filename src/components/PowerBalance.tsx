import { useMemo } from 'react'
import type { Store } from '../hooks/useStore'
import { PHASE_STYLES } from '../utils/phaseStyle'
import {
  CAPACITE_PAR_PHASE_VA,
  PUISSANCE_SOUSCRITE_VA,
  computePhasePower,
} from '../utils/powerBalance'

function fmtW(w: number): string {
  return w >= 1000 ? `${(w / 1000).toFixed(1)} kW` : `${Math.round(w)} W`
}

/**
 * Bilan de puissance : charge nominale raccordée estimée, répartie par phase,
 * comparée à la capacité par phase de l'abonnement (18 kVA tri ⇒ 6 kVA/phase).
 */
export function PowerBalance({ store }: { store: Store }) {
  const res = useMemo(() => computePhasePower(store), [store])
  if (res.total === 0) return null

  const phases = ['L1', 'L2', 'L3'] as const
  const cap = CAPACITE_PAR_PHASE_VA

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Bilan de puissance
        </h2>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {(PUISSANCE_SOUSCRITE_VA / 1000).toFixed(0)} kVA tri ·{' '}
          {(cap / 1000).toFixed(0)} kVA/phase
        </span>
      </div>
      <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">
        Charge nominale raccordée (appareils fixes + éclairage). Hors prises
        (charge variable).
      </p>

      <div className="space-y-2">
        {phases.map((p) => {
          const v = res.parPhase[p]
          const pct = cap ? (v / cap) * 100 : 0
          const over = v > cap
          const st = PHASE_STYLES[p]
          return (
            <div key={p} className="flex items-center gap-2">
              <span className="w-6 text-xs font-medium tabular-nums">{p}</span>
              <div className="relative h-3 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded ${over ? 'bg-red-500' : st.dot}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <span
                className={`w-28 text-right text-xs tabular-nums ${
                  over
                    ? 'font-semibold text-red-600 dark:text-red-400'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {fmtW(v)} · {Math.round(pct)}%
              </span>
            </div>
          )
        })}
      </div>

      {(res.tri > 0 || res.nonAttribue > 0) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 dark:border-slate-800 pt-2 text-[11px] text-slate-500 dark:text-slate-400">
          {res.tri > 0 && (
            <span>
              dont triphasé {fmtW(res.tri)} (réparti sur les 3 phases)
            </span>
          )}
          {res.nonAttribue > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              ⚠ {fmtW(res.nonAttribue)} non attribués (ligne/phase à préciser)
            </span>
          )}
        </div>
      )}
    </div>
  )
}

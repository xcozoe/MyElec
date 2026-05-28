import { useRef } from 'react'
import {
  DEFAULT_PHASE_COLORS,
  PHASE_COLOR_KEYS,
  useSettings,
  type PhaseColorKey,
} from '../context/SettingsContext'
import { PHASE_STYLES } from '../utils/phaseStyle'
import type { Store } from '../hooks/useStore'
import type {
  AppareilFixe,
  EndPoint,
  Ligne,
  Modification,
  Piece,
  Tableau,
  Volet,
} from '../types/electrical'
import { HistoriqueView } from './HistoriqueView'
import { CartographieEnCours } from './CartographieEnCours'

const PHASE_LABELS: Record<PhaseColorKey, string> = {
  L1: 'Phase 1 (L1)',
  L2: 'Phase 2 (L2)',
  L3: 'Phase 3 (L3)',
  TRI: 'Triphasé (TRI)',
  inconnue: 'Phase inconnue',
}

export function SettingsView({
  store,
  dark,
  setDark,
  onOpenTableau,
}: {
  store: Store
  dark: boolean
  setDark: (next: boolean) => void
  onOpenTableau: (tableauId: string, focusDisjoncteurId?: string) => void
}) {
  const { phaseColors, setPhaseColor, resetPhaseColors } = useSettings()
  const fileRef = useRef<HTMLInputElement | null>(null)

  const handleExport = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      tableaux: store.tableaux,
      pieces: store.pieces,
      lignes: store.lignes,
      endpoints: store.endpoints,
      volets: store.volets,
      appareils: store.appareils,
      modifications: store.modifications,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    a.href = url
    a.download = `myelec-export-${ts}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      // Coerce chaque collection en tableau : on ne fait pas confiance au
      // contenu du fichier (un objet à la place d'un tableau ferait planter
      // `.length` / l'import). Tout ce qui n'est pas un tableau devient [].
      const asArray = <T,>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : [])
      const isArr = Array.isArray(parsed)
      const rawTableaux = isArr ? parsed : parsed?.tableaux
      if (!Array.isArray(rawTableaux))
        throw new Error('Le fichier ne contient pas de tableaux exploitables.')
      const tableaux = rawTableaux as Tableau[]
      const modifications = isArr ? [] : asArray<Modification>(parsed?.modifications)
      const pieces = isArr ? [] : asArray<Piece>(parsed?.pieces)
      const lignes = isArr ? [] : asArray<Ligne>(parsed?.lignes)
      const endpoints = isArr ? [] : asArray<EndPoint>(parsed?.endpoints)
      const volets = isArr ? [] : asArray<Volet>(parsed?.volets)
      const appareils = isArr ? [] : asArray<AppareilFixe>(parsed?.appareils)
      const counts = [
        `${tableaux.length} tableau(x)`,
        `${pieces.length} pièce(s)`,
        `${lignes.length} ligne(s)`,
        `${endpoints.length} end-point(s)`,
        `${volets.length} volet(s)`,
        `${appareils.length} appareil(s)`,
        `${modifications.length} entrée(s) d'historique`,
      ].join(', ')
      if (!confirm(`Remplacer toutes les données par celles du fichier (${counts}) ?`))
        return
      await store.importAll({
        tableaux,
        pieces,
        lignes,
        endpoints,
        volets,
        appareils,
        modifications,
      })
      alert('Import effectué.')
    } catch (e) {
      alert(`Erreur d'import : ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Paramètres
        </h1>
      </div>

      <Section title="Apparence">
        <div className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 px-4 py-3 bg-white dark:bg-slate-900">
          <div>
            <div className="text-sm font-medium">Thème sombre</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Bascule entre les modes clair et sombre. Le choix est conservé sur cet appareil.
            </div>
          </div>
          <button
            onClick={() => setDark(!dark)}
            role="switch"
            aria-checked={dark}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              dark ? 'bg-slate-900 dark:bg-white' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-900 transition-transform shadow ${
                dark ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </Section>

      <Section title="Données">
        <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm font-medium">Exporter</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Téléchargement d'un fichier JSON avec toutes les données (tableaux, pièces, lignes, end-points, équipements, historique).
              </div>
            </div>
            <button
              onClick={handleExport}
              className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Exporter (JSON)
            </button>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm font-medium">Importer</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Remplace toutes les données par le contenu d'un fichier JSON. Une confirmation sera demandée.
              </div>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-sm rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Importer (JSON)…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleImportFile(f)
              }}
            />
          </div>
        </div>
      </Section>

      <Section title="Couleurs des phases">
        <div className="flex items-center justify-end mb-2">
          <button
            onClick={() => {
              if (confirm('Restaurer les couleurs par défaut ?')) resetPhaseColors()
            }}
            className="text-xs rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Réinitialiser
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Modification appliquée en direct dans toute l'app (cartes, badges,
          listes…). Persisté localement sur cet appareil.
        </p>
        <ul className="space-y-2">
          {PHASE_COLOR_KEYS.map((key) => {
            const style = PHASE_STYLES[key]
            const value = phaseColors[key]
            const isDefault =
              value.toLowerCase() === DEFAULT_PHASE_COLORS[key].toLowerCase()
            return (
              <li
                key={key}
                className="flex items-center gap-3 rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-900"
              >
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style.ring} ${style.bg} ${style.text}`}
                >
                  <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                  {style.label}
                </span>
                <div className="flex-1">
                  <div className="text-sm">{PHASE_LABELS[key]}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {value}
                    {!isDefault && (
                      <button
                        onClick={() =>
                          setPhaseColor(key, DEFAULT_PHASE_COLORS[key])
                        }
                        className="ml-2 underline decoration-dotted hover:opacity-80"
                        title={`Restaurer la couleur d'origine (${DEFAULT_PHASE_COLORS[key]})`}
                      >
                        défaut
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="color"
                  value={value}
                  onChange={(e) => setPhaseColor(key, e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-slate-300 dark:border-slate-700 bg-transparent"
                  aria-label={`Couleur ${PHASE_LABELS[key]}`}
                />
              </li>
            )
          })}
        </ul>
      </Section>

      <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
        <CartographieEnCours
          state={store}
          onOpen={(tableauId, disjoncteurId) =>
            onOpenTableau(tableauId, disjoncteurId)
          }
        />
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
        <HistoriqueView
          modifications={store.modifications}
          tableaux={store.tableaux}
          onOpenEntite={(tableauId, disjoncteurId) =>
            onOpenTableau(tableauId, disjoncteurId)
          }
        />
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-3">
        {title}
      </h2>
      {children}
    </section>
  )
}

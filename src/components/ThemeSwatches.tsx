/**
 * Palette de 9 couleurs de thème, calquée sur MyMemory. Le choix est
 * persisté en profil (themeColor) et appliqué à la variable CSS --brand.
 */

const SWATCHES: string[] = [
  '#6d5ef6', // violet (défaut MyMemory)
  '#e7445b', // rose vif
  '#f59e0b', // ambre
  '#10b981', // vert
  '#3b82f6', // bleu
  '#0ea5e9', // cyan
  '#8b5cf6', // pourpre clair
  '#ec4899', // rose
  '#475569', // ardoise
]

export const DEFAULT_BRAND = SWATCHES[0]

export function ThemeSwatches({
  value,
  onChange,
}: {
  value: string
  onChange: (hex: string) => void
}) {
  const current = (value || DEFAULT_BRAND).toLowerCase()
  return (
    <div className="flex flex-wrap gap-2">
      {SWATCHES.map((hex) => {
        const selected = hex.toLowerCase() === current
        return (
          <button
            key={hex}
            type="button"
            onClick={() => onChange(hex)}
            aria-label={`Couleur ${hex}`}
            aria-pressed={selected}
            className={
              'h-9 w-9 rounded-full transition-transform shadow-sm ' +
              (selected
                ? 'ring-2 ring-slate-900 dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-slate-950 scale-110'
                : 'ring-1 ring-slate-200 dark:ring-slate-700 hover:scale-105')
            }
            style={{ backgroundColor: hex }}
          />
        )
      })}
    </div>
  )
}

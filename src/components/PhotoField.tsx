import { useState } from 'react'
import { Lightbox } from './Lightbox'

/**
 * Champ d'édition d'une URL d'image avec vignette cliquable (lightbox)
 * et fallback en pointillés quand aucune image n'est définie.
 */
export function PhotoField({
  value,
  onChange,
  alt,
  hint,
  label = 'Photo',
}: {
  value: string | undefined
  onChange: (url: string | undefined) => void
  alt: string
  hint?: string
  label?: string
}) {
  const [zoom, setZoom] = useState(false)
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
      </span>
      <div className="mt-1 flex items-start gap-3">
        {value ? (
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="shrink-0 rounded border border-slate-200 dark:border-slate-700 bg-white p-1 hover:shadow"
            aria-label="Agrandir la photo"
            title="Agrandir"
          >
            <img
              src={value}
              alt={alt}
              className="h-20 w-20 object-contain"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.opacity = '0.3'
              }}
            />
          </button>
        ) : (
          <div className="shrink-0 h-20 w-20 rounded border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-500">
            (aucune)
          </div>
        )}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            placeholder="/sources/mon-image.png"
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-mono"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="mt-1 text-[11px] underline decoration-dotted text-slate-500 dark:text-slate-400"
            >
              Retirer la photo
            </button>
          )}
        </div>
      </div>
      {hint && (
        <span className="block mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      )}
      {zoom && value && (
        <Lightbox src={value} alt={alt} caption={alt} onClose={() => setZoom(false)} />
      )}
    </label>
  )
}

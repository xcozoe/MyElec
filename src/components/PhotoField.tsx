import { useRef, useState } from 'react'
import { Lightbox } from './Lightbox'
import { useNotify } from './Dialogs'
import { fileToResizedDataUrl } from '../utils/image'

/**
 * Vignette photo compacte, pensée pour l'en-tête d'un éditeur (à gauche du
 * titre) :
 *  - vide → cadre en pointillés avec « Photo » dedans, cliquable pour ajouter ;
 *  - rempli → la photo (clic = agrandir en lightbox), avec un bouton appareil
 *    photo (prendre/choisir une autre) et une croix (retirer).
 *
 * Le fichier choisi est redimensionné/compressé côté navigateur avant d'être
 * stocké en data URL (cf. fileToResizedDataUrl). On n'expose plus le chemin du
 * fichier ni de texte explicatif.
 */
export function PhotoField({
  value,
  onChange,
  alt,
}: {
  value: string | undefined
  onChange: (url: string | undefined) => void
  alt: string
}) {
  const [zoom, setZoom] = useState(false)
  const [busy, setBusy] = useState(false)
  const [broken, setBroken] = useState<string | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const notify = useNotify()

  const pick = () => inputRef.current?.click()

  const handleFile = async (file: File) => {
    setBusy(true)
    try {
      const url = await fileToResizedDataUrl(file)
      onChange(url)
      setBroken(undefined)
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const isBroken = broken === value
  const hasPhoto = !!value && !isBroken

  return (
    <div className="shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
        }}
      />

      <div className="relative h-16 w-16">
        {hasPhoto ? (
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="h-16 w-16 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white"
            aria-label="Agrandir la photo"
            title="Agrandir"
          >
            <img
              src={value}
              alt={alt}
              className="h-full w-full object-cover"
              onError={() => setBroken(value)}
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            className="h-16 w-16 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-0.5 text-slate-400 dark:text-slate-500 hover:border-slate-400 hover:text-slate-500 disabled:opacity-50"
            aria-label="Ajouter une photo"
            title="Ajouter une photo"
          >
            <CameraIcon className="h-5 w-5" />
            <span className="text-[10px] font-medium">
              {busy ? '…' : 'Photo'}
            </span>
          </button>
        )}

        {hasPhoto && (
          <>
            {/* Prendre / choisir une autre photo */}
            <button
              type="button"
              onClick={pick}
              disabled={busy}
              className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 ring-2 ring-white dark:ring-slate-950 flex items-center justify-center shadow disabled:opacity-50"
              aria-label="Changer la photo"
              title="Changer la photo"
            >
              <CameraIcon className="h-3.5 w-3.5" />
            </button>
            {/* Retirer la photo */}
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 ring-2 ring-white dark:ring-slate-950 flex items-center justify-center text-xs leading-none hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/60 dark:hover:text-red-200"
              aria-label="Retirer la photo"
              title="Retirer la photo"
            >
              ✕
            </button>
          </>
        )}
      </div>

      {zoom && value && (
        <Lightbox src={value} alt={alt} caption={alt} onClose={() => setZoom(false)} />
      )}
    </div>
  )
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
      />
    </svg>
  )
}

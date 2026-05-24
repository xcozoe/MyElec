import { useEffect } from 'react'

/**
 * Affiche une image en plein écran avec un overlay sombre. Ferme au
 * clic en dehors de l'image, sur la croix, ou via Echap.
 */
export function Lightbox({
  src,
  alt,
  caption,
  onClose,
}: {
  src: string
  alt: string
  caption?: string
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm p-4 sm:p-8 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-sm"
        aria-label="Fermer"
      >
        Fermer ✕
      </button>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-5xl max-h-full flex flex-col items-center gap-3"
      >
        <img
          src={src}
          alt={alt}
          className="max-h-[85vh] max-w-full rounded-lg bg-white object-contain"
        />
        {caption && (
          <div className="text-xs sm:text-sm text-slate-200 text-center max-w-2xl">
            {caption}
          </div>
        )}
      </div>
    </div>
  )
}

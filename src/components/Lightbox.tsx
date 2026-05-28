import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Affiche une image en plein écran avec un overlay sombre. Ferme au
 * clic en dehors de l'image, sur la croix, ou via Echap.
 *
 * Rendu via React portal sur `document.body` pour éviter les bugs de
 * sémantique HTML quand la Lightbox est imbriquée dans un <label>
 * (notamment sur iOS Safari, où le tap sur l'overlay est intercepté
 * par le label et le bouton Fermer ne se déclenche pas).
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
    // Sauvegarde puis restaure la valeur précédente plutôt que de forcer ''
    // (évite de déverrouiller le scroll d'une couche parente qui l'aurait
    // elle-même verrouillé).
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const content = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm p-4 sm:p-8 flex items-center justify-center"
      style={{
        paddingTop: 'max(1rem, calc(env(safe-area-inset-top) + 0.5rem))',
        paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="absolute right-3 sm:right-4 rounded-full bg-white/15 hover:bg-white/25 text-white px-4 py-2 text-sm font-medium"
        style={{ top: 'max(0.75rem, calc(env(safe-area-inset-top) + 0.25rem))' }}
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

  if (typeof document === 'undefined') return content
  return createPortal(content, document.body)
}

import { useEffect, useRef, type TextareaHTMLAttributes } from 'react'

const MIN_HEIGHT = 56 // ~2 lignes + padding

/**
 * Zone de texte qui s'adapte à la hauteur de son contenu (auto-grow) et reste
 * redimensionnable manuellement (poignée verticale). API identique à un
 * <textarea> natif (value/onChange/className…).
 */
export function AutoTextarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const fit = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, MIN_HEIGHT)}px`
  }

  // Réajuste quand la valeur change (y compris au montage / reset du formulaire).
  useEffect(fit, [props.value])

  return (
    <textarea ref={ref} onInput={fit} className={`resize-y ${className}`} {...props} />
  )
}

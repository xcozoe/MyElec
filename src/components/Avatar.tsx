/**
 * Avatar polymorphe :
 *  - data:image/... ou URL http → <img>
 *  - 1-3 caractères (emoji compris) → affiche tel quel sur fond pastel
 *  - sinon → initiales tirées du nom sur fond dégradé violet
 *
 * Le mécanisme est identique à MyMemory (presets emojis + photo data URL).
 */
import type { CSSProperties } from 'react'

interface AvatarProps {
  name?: string
  avatar?: string
  size?: number
  className?: string
}

function initialsOf(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function isImageData(value?: string): boolean {
  if (!value) return false
  return value.startsWith('data:image/') || /^https?:\/\//.test(value)
}

function isShortGlyph(value?: string): boolean {
  if (!value) return false
  // 1 à 3 codepoints visibles (suffit pour les emojis composés type 👨‍👩‍👧).
  const segs = Array.from(value)
  return segs.length >= 1 && segs.length <= 6
}

export function Avatar({ name, avatar, size = 44, className = '' }: AvatarProps) {
  const style: CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    fontSize: Math.round(size * 0.42),
  }
  const base =
    'inline-flex items-center justify-center rounded-full overflow-hidden font-semibold text-white shadow-sm select-none'

  if (isImageData(avatar)) {
    return (
      <span
        className={`${base} ${className}`}
        style={style}
        aria-label={name ? `Avatar de ${name}` : 'Avatar'}
      >
        <img
          src={avatar}
          alt=""
          className="w-full h-full object-cover"
          draggable={false}
        />
      </span>
    )
  }

  if (isShortGlyph(avatar)) {
    return (
      <span
        className={`${base} bg-gradient-to-br from-violet-100 to-violet-200 dark:from-slate-700 dark:to-slate-800 ${className}`}
        style={style}
        aria-label={name ? `Avatar de ${name}` : 'Avatar'}
      >
        <span style={{ fontSize: Math.round(size * 0.55) }} aria-hidden>
          {avatar}
        </span>
      </span>
    )
  }

  return (
    <span
      className={`${base} bg-gradient-to-br from-(--brand) to-[color-mix(in_srgb,var(--brand)_70%,black)] ${className}`}
      style={style}
      aria-label={name ? `Avatar de ${name}` : 'Avatar'}
    >
      {initialsOf(name)}
    </span>
  )
}

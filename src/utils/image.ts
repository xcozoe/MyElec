/**
 * Convertit un fichier image en data URL JPEG redimensionnée, en **préservant
 * le ratio** (contrairement à `fileToAvatarDataUrl` qui crope en carré).
 *
 * Adapté aux photos de terrain (étiquette de disjoncteur, coffret…) qu'on doit
 * pouvoir relire en grand : on borne le plus grand côté à `maxDim` et on
 * compresse en JPEG. Une photo de téléphone (2-5 Mo) ressort à ~100-250 Ko.
 *
 *  1. Lecture du fichier en data URL (FileReader)
 *  2. Chargement dans un <img>
 *  3. Mise à l'échelle pour que max(largeur, hauteur) ≤ maxDim (jamais agrandi)
 *  4. Export `toDataURL('image/jpeg', quality)`
 */
export async function fileToResizedDataUrl(
  file: File,
  maxDim = 1280,
  quality = 0.72,
): Promise<string> {
  if (!/^image\//.test(file.type || '')) {
    throw new Error('Choisissez un fichier image.')
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader()
    fr.onerror = () => reject(new Error('Lecture du fichier impossible.'))
    fr.onload = () => resolve(String(fr.result || ''))
    fr.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image()
    im.onerror = () => reject(new Error('Image illisible.'))
    im.onload = () => resolve(im)
    im.src = dataUrl
  })

  const naturalW = img.naturalWidth || img.width
  const naturalH = img.naturalHeight || img.height
  if (!naturalW || !naturalH) throw new Error('Image vide.')

  const scale = Math.min(1, maxDim / Math.max(naturalW, naturalH))
  const w = Math.round(naturalW * scale)
  const h = Math.round(naturalH * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas non disponible.')
  ctx.drawImage(img, 0, 0, w, h)

  return canvas.toDataURL('image/jpeg', quality)
}

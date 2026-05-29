/**
 * Convertit un fichier image en data URL JPEG carrée, redimensionnée et
 * compressée — pour rester sous la limite serveur (300 Ko en base64).
 *
 * Mécanisme identique à MyMemory :
 *  1. Lecture du fichier en data URL (FileReader)
 *  2. Chargement dans un <img>
 *  3. Crop carré centré (côté = min(width, height))
 *  4. Dessin sur un canvas SIZE×SIZE (256 par défaut)
 *  5. Export `toDataURL('image/jpeg', 0.85)`
 *
 * Une photo de téléphone (2-5 Mo) ressort à ~25-50 Ko, largement sous la
 * limite des 300 Ko côté serveur.
 */
export async function fileToAvatarDataUrl(
  file: File,
  size = 256,
  quality = 0.85,
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
  const side = Math.min(naturalW, naturalH)
  if (!side) throw new Error('Image vide.')

  const sx = (naturalW - side) / 2
  const sy = (naturalH - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas non disponible.')
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)

  return canvas.toDataURL('image/jpeg', quality)
}

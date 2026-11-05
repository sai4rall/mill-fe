// Downscale an image client-side to a JPEG so uploads stay small (~50-200 KB).
export async function resizeImage(file, maxSize = 800, quality = 0.85) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Unsupported image. Please choose a JPG, PNG or WebP photo.')
  }
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Could not process the image')
  return new File([blob], 'photo.jpg', { type: 'image/jpeg' })
}

// Strip spaces/dashes and +91 / 91 / 0 prefixes, mirroring the backend's normalisation.
export function normalizePhone(raw = '') {
  let d = raw.replace(/[\s\-()]/g, '')
  if (d.startsWith('+91')) d = d.slice(3)
  else if (d.length === 12 && d.startsWith('91')) d = d.slice(2)
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return d
}

export const isValidPhone = (raw) => /^[6-9]\d{9}$/.test(normalizePhone(raw))

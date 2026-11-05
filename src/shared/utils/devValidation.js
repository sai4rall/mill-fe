// Client-side checks mirroring the backend (which re-validates and also verifies a logo's actual bytes).
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const LOGO_MAX_BYTES = 1024 * 1024

export function logoFileError(file) {
  if (!LOGO_TYPES.includes(file.type)) return 'Logo must be a PNG, JPEG or WebP image'
  if (file.size > LOGO_MAX_BYTES) return 'Logo must be 1 MB or smaller'
  return null
}

const USERNAME_RE = /^[A-Za-z0-9._-]{3,50}$/

export function validateSuperAdmin({ username, fullName }) {
  const errors = {}
  const u = username.trim()
  if (!u) errors.username = 'Username is required'
  else if (!USERNAME_RE.test(u)) errors.username = 'Username must be 3-50 characters: letters, digits, . _ -'
  if (fullName.trim().length > 100) errors.fullName = 'Full name must be at most 100 characters'
  return errors
}

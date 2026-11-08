// New-mill form (super admin). Keep in sync with backend CreateMillRequest.
import { isMobile } from './phone'

export const MILL_FIELDS = [
  { key: 'name', label: 'Mill name', required: true },
  { key: 'location', label: 'Location', required: true },
  { key: 'contactPhone', label: 'Contact phone', required: true, phone: true },
  { key: 'contactEmail', label: 'Contact email', type: 'email' },
  { key: 'adminUsername', label: 'Admin username', required: true },
  { key: 'adminFullName', label: 'Admin full name', required: true },
]

const collapse = (s) => String(s ?? '').trim().replace(/\s+/g, ' ')
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u
const USERNAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{2,49}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Returns { field: message } for every invalid field (empty when valid). */
export function validateMill(form) {
  const f = millPayload(form)
  const e = {}
  if (!f.name) e.name = 'Mill name is required'
  else if (f.name.length < 2 || f.name.length > 100) e.name = 'Mill name must be 2-100 characters'
  if (!f.location) e.location = 'Location is required'
  else if (f.location.length < 2 || f.location.length > 200) e.location = 'Location must be 2-200 characters'
  if (!f.contactPhone) e.contactPhone = 'Contact phone is required'
  else if (!isMobile(f.contactPhone)) e.contactPhone = 'Enter a valid 10-digit mobile number'
  if (f.contactEmail && (!EMAIL_RE.test(f.contactEmail) || f.contactEmail.length > 100)) e.contactEmail = 'Enter a valid email address'
  if (!f.adminUsername) e.adminUsername = 'Admin username is required'
  else if (!USERNAME_RE.test(f.adminUsername)) e.adminUsername = 'Admin username must be 3-50 characters: letters, digits, . _ -'
  if (!f.adminFullName) e.adminFullName = 'Admin full name is required'
  else if (f.adminFullName.length < 2 || f.adminFullName.length > 100) e.adminFullName = 'Admin full name must be 2-100 characters'
  else if (!NAME_RE.test(f.adminFullName)) e.adminFullName = "Admin full name can contain only letters, spaces and . ' -"
  return e
}

/** Trimmed request body; blank email is left out. */
export function millPayload(form) {
  return {
    name: collapse(form.name), location: collapse(form.location), contactPhone: String(form.contactPhone ?? '').trim(),
    contactEmail: String(form.contactEmail ?? '').trim() || null, adminUsername: String(form.adminUsername ?? '').trim(),
    adminFullName: collapse(form.adminFullName),
  }
}

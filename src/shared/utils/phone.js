// Indian mobile numbers are typed as exactly 10 digits. Used by every phone input so the field cannot hold more.

/**
 * What a phone input keeps: digits only, at most 10. A pasted "+91 98765 43210", "919876543210" or "09876543210"
 * becomes "9876543210".
 */
export function phoneInput(value) {
  let d = String(value ?? '').replace(/\D/g, '')
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2)
  else if (d.length > 10 && d.startsWith('0')) d = d.slice(1)
  return d.slice(0, 10)
}

export const PHONE_MAX = 10
export const isMobile = (v) => /^[6-9]\d{9}$/.test(String(v ?? ''))

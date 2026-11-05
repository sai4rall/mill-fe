// Farmer registration rules. Keep in sync with backend FarmerDto (Bean Validation) and OtpService.normalizePhone.
import { isValidPhone } from './image'

export const MESSAGES = {
  nameRequired: 'Name is required',
  nameLength: 'Name must be 2-100 characters',
  nameChars: "Name can contain only letters, spaces and . ' -",
  phoneRequired: 'Mobile number is required',
  phoneInvalid: 'Enter a valid 10-digit mobile number',
  addressLength: 'Address must be at most 500 characters',
  bankAccount: 'Bank account number must be 9-18 digits',
  bankNameLength: 'Bank name must be 2-100 characters',
  bankNameChars: "Bank name can contain only letters, spaces and . & ( ) ' -",
  ifsc: 'IFSC code must be 11 characters, e.g. SBIN0001234',
  bankDetails: 'Bank account number, bank name and IFSC code must be provided together',
}

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u
const BANK_NAME_RE = /^[A-Za-z][A-Za-z .&()'-]*$/
const ACCOUNT_RE = /^\d{9,18}$/
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/

const collapse = (s = '') => s.trim().replace(/\s+/g, ' ')

/** Same clean-up the backend applies: trim, collapse spaces, strip spaces from account/IFSC, upper-case IFSC. */
export function normalizeFarmer(form) {
  return {
    name: collapse(form.name),
    phone: (form.phone || '').trim(),
    address: (form.address || '').trim(),
    bankAccount: (form.bankAccount || '').replace(/\s+/g, ''),
    bankName: collapse(form.bankName),
    ifscCode: (form.ifscCode || '').replace(/\s+/g, '').toUpperCase(),
  }
}

/**
 * Returns { field: message } for every invalid field (empty object when valid).
 * `requirePhone` is false when editing a farmer whose number was not changed (legacy numbers are kept as-is).
 */
export function validateFarmer(form, { requirePhone = true } = {}) {
  const f = normalizeFarmer(form)
  const errors = {}

  if (!f.name) errors.name = MESSAGES.nameRequired
  else if (f.name.length < 2 || f.name.length > 100) errors.name = MESSAGES.nameLength
  else if (!NAME_RE.test(f.name)) errors.name = MESSAGES.nameChars

  if (requirePhone) {
    if (!f.phone) errors.phone = MESSAGES.phoneRequired
    else if (!isValidPhone(f.phone)) errors.phone = MESSAGES.phoneInvalid
  }

  if (f.address.length > 500) errors.address = MESSAGES.addressLength

  if (f.bankAccount && !ACCOUNT_RE.test(f.bankAccount)) errors.bankAccount = MESSAGES.bankAccount

  if (f.bankName) {
    if (f.bankName.length < 2 || f.bankName.length > 100) errors.bankName = MESSAGES.bankNameLength
    else if (!BANK_NAME_RE.test(f.bankName)) errors.bankName = MESSAGES.bankNameChars
  }

  if (f.ifscCode && !IFSC_RE.test(f.ifscCode)) errors.ifscCode = MESSAGES.ifsc

  const filled = [f.bankAccount, f.bankName, f.ifscCode].filter(Boolean).length
  if (filled !== 0 && filled !== 3) errors.bankDetails = MESSAGES.bankDetails

  return errors
}

/** Maps the backend's `fields` error object onto form field keys. */
export function serverFieldErrors(fields = {}) {
  const { bankDetailsComplete, ...rest } = fields
  return bankDetailsComplete ? { ...rest, bankDetails: bankDetailsComplete } : rest
}

// Why a lorry was turned away. Matches backend RejectedLorry.Reason.
export const REJECTION_REASONS = [
  { value: 'HIGH_MOISTURE', label: 'High moisture' },
  { value: 'POOR_QUALITY', label: 'Poor quality' },
  { value: 'FOREIGN_MATTER', label: 'Foreign matter / stones' },
  { value: 'WRONG_VARIETY', label: 'Wrong variety' },
  { value: 'OTHER', label: 'Other' },
]

export const reasonLabel = (value) => REJECTION_REASONS.find(r => r.value === value)?.label || value || '—'

/** Client-side checks matching the backend: date (not future), truck number, reason; notes when the reason is Other. */
export function validateRejection(form, isFuture) {
  const errors = {}
  if (!form.rejectionDate) errors.rejectionDate = 'Date is required'
  else if (isFuture(form.rejectionDate)) errors.rejectionDate = 'Date cannot be in the future'
  if (!form.truckNumber?.trim()) errors.truckNumber = 'Truck number is required'
  else if (form.truckNumber.replace(/\s+/g, '').length > 20) errors.truckNumber = 'Truck number must be at most 20 characters'
  if (form.approxWeightQuintals !== '' && form.approxWeightQuintals != null && !(Number(form.approxWeightQuintals) > 0)) errors.approxWeightQuintals = 'Weight must be greater than 0'
  if (form.moisturePct !== '' && form.moisturePct != null && !(Number(form.moisturePct) >= 0 && Number(form.moisturePct) <= 100)) errors.moisturePct = 'Moisture % must be between 0 and 100'
  if (!form.reason) errors.reason = 'Reason is required'
  if (form.reason === 'OTHER' && !form.notes?.trim()) errors.notes = 'Describe the reason when it is Other'
  return errors
}

/** Request body: blanks become null, numbers parsed, truck number upper-cased without spaces. */
export function rejectionPayload(form) {
  const n = (v) => (v === '' || v == null ? null : Number(v))
  return {
    rejectionDate: form.rejectionDate,
    truckNumber: form.truckNumber.replace(/\s+/g, '').toUpperCase(),
    farmerId: form.farmerId ? Number(form.farmerId) : null,
    approxWeightQuintals: n(form.approxWeightQuintals),
    moisturePct: n(form.moisturePct),
    reason: form.reason,
    notes: form.notes?.trim() || null,
  }
}

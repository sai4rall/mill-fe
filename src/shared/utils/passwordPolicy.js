// Mirrors backend ChangePasswordRequest + PasswordChangeService rules. Keep the two in sync.
export const PASSWORD_HINT = '8-64 characters, at least one letter and one digit, no spaces'

/** Returns { field: message } for the change-password form; empty object when valid. */
export function validatePasswordChange({ currentPassword = '', newPassword = '', confirmPassword = '' }, username = '') {
  const errors = {}
  if (!currentPassword) errors.currentPassword = 'Current password is required'

  if (!newPassword) errors.newPassword = 'New password is required'
  else if (newPassword.length < 8 || newPassword.length > 64) errors.newPassword = 'New password must be 8-64 characters'
  else if (!/^(?=.*[A-Za-z])(?=.*\d)\S+$/.test(newPassword))
    errors.newPassword = 'New password needs at least one letter and one digit, and no spaces'
  else if (currentPassword && newPassword === currentPassword)
    errors.newPassword = 'New password must be different from the current password'
  else if (username && newPassword.toLowerCase().includes(username.toLowerCase()))
    errors.newPassword = 'New password must not contain your username'

  if (!confirmPassword) errors.confirmPassword = 'Please re-enter the new password'
  else if (newPassword && confirmPassword !== newPassword) errors.confirmPassword = 'Passwords do not match'
  return errors
}

/** Maps an API error to { field: message } (field errors) or { form: message }. */
export function passwordServerErrors(err) {
  const data = err?.response?.data || {}
  if (data.fields && Object.keys(data.fields).length) return { ...data.fields }
  const msg = data.error || err?.message || 'Could not change password'
  if (/current password/i.test(msg) && /incorrect/i.test(msg)) return { currentPassword: msg }
  if (/^new password/i.test(msg)) return { newPassword: msg }
  return { form: msg }
}

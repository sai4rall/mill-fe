import { useState } from 'react'
import { changePassword } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { passwordServerErrors, validatePasswordChange } from '../utils/passwordPolicy'

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' }

/**
 * Form state for "change my password", shared by the classic, v2 and v3 UIs.
 * On success the fresh token from the server replaces the current one (other sessions are signed out).
 */
export function useChangePassword({ onSuccess } = {}) {
  const { user, refreshSession } = useAuth()
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const setField = (key) => (e) => {
    const value = e.target.value
    setValues(v => ({ ...v, [key]: value }))
    setErrors(({ [key]: _, form: __, ...rest }) => rest)
  }

  const reset = () => { setValues(EMPTY); setErrors({}); setSaving(false) }

  const submit = async (e) => {
    e?.preventDefault()
    const found = validatePasswordChange(values, user?.username)
    setErrors(found)
    if (Object.keys(found).length) return false
    setSaving(true)
    try {
      const data = await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      refreshSession(data)
      reset()
      onSuccess?.()
      return true
    } catch (err) {
      setErrors(passwordServerErrors(err))
      setSaving(false)
      return false
    }
  }

  return { values, errors, saving, setField, submit, reset }
}

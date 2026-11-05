import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Modal from './Modal'
import { useChangePassword } from '../../shared/hooks/useChangePassword'
import { PASSWORD_HINT } from '../../shared/utils/passwordPolicy'

function PasswordField({ id, label, value, onChange, error, hint, autoComplete }) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <input id={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete}
          aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 ${
            error ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:ring-emerald-200'}`} />
        <button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-600">
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error ? <p id={`${id}-error`} className="text-xs text-red-600 mt-1">{error}</p>
        : hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  )
}

export default function ChangePasswordModal({ onClose, onChanged }) {
  const { values, errors, saving, setField, submit } = useChangePassword({ onSuccess: onChanged })
  return (
    <Modal title="Change password" onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <PasswordField id="cp-current" label="Current password" value={values.currentPassword}
          onChange={setField('currentPassword')} error={errors.currentPassword} autoComplete="current-password" />
        <PasswordField id="cp-new" label="New password" value={values.newPassword} hint={PASSWORD_HINT}
          onChange={setField('newPassword')} error={errors.newPassword} autoComplete="new-password" />
        <PasswordField id="cp-confirm" label="Confirm new password" value={values.confirmPassword}
          onChange={setField('confirmPassword')} error={errors.confirmPassword} autoComplete="new-password" />
        {errors.form && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errors.form}</p>}
        <p className="text-xs text-slate-500">You will stay signed in here; other devices will be signed out.</p>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
            {saving ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
